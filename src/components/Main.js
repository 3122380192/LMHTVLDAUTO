import React, {useState, useEffect} from 'react';
import {Button, Space, Switch, Radio, Row, Col, message, Select, Card, Input, Badge} from "antd";
import ApiUtils from "../api/api-utils";
import {connect} from "react-redux";
import {showTeammateRankedType, language} from "../redux/reducers/ConfigReducer";
import withErrorBoundary from "./error/withErrorBoundary";
import Hovercard from "./main/Hovercard";
import RecentTeammates from "./main/RecentTeammates";
import {useTranslation} from 'react-i18next';
import {trackEvent} from './GoogleAnalytics';
import { 
  PlayCircleOutlined, 
  CloseCircleOutlined, 
  GlobalOutlined, 
  SettingOutlined, 
  MessageOutlined, 
  SkinOutlined, 
  ThunderboltOutlined,
  BarChartOutlined,
  PoweroffOutlined,
  KeyOutlined,
  UserOutlined,
  LockOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';

const {ipcRenderer} = window.require('electron');

function Main(props) {
  const [killLoLLoading, setKillLoLLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const {t, i18n} = useTranslation();

  // Histats
  useEffect(() => {
    window._Hasync = window._Hasync || [];
    window._Hasync.push(['Histats.start', '1,4818979,4,0,0,0,00010000']);
    window._Hasync.push(['Histats.fasi', '1']);
    window._Hasync.push(['Histats.track_hits', '']);

    const hs = document.createElement('script');
    hs.type = 'text/javascript';
    hs.async = true;
    hs.src = 'https://s10.histats.com/js15_as.js';
    const head = document.getElementsByTagName('head')[0];
    const body = document.getElementsByTagName('body')[0];
    (head || body).appendChild(hs);

    return () => {
      (head || body).removeChild(hs);
    };
  }, []);

  useEffect(() => {
    trackEvent('heartbeat');
    const intervalId = setInterval(() => {
      trackEvent('heartbeat');
    }, 5 * 60 * 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handleEvent = (event, data) => {
      console.log('Received message [kill-lol-ack]:', data);
      setKillLoLLoading(false)
      let s = '';
      if (data.length === 0) {
        s = t('main.appStates.lolNotOpen');
      } else {
        s = (
          <>
            {t('main.closedProcessesCount', {count: data.length})}
            {data.map((p, index) => (
              <React.Fragment key={index}>
                <br/>
                {p.imageName} {p.pid}
              </React.Fragment>
            ))}
          </>
        );
      }
      messageApi.open({
        type: 'success',
        content: s,
      });
    }
    ipcRenderer.on('kill-lol-ack', handleEvent);
    return () => {
      ipcRenderer.removeListener('kill-lol-ack', handleEvent);
    }
  }, []);
  
  const [championsList, setChampionsList] = useState([]);

  // Auto-migrate language from zh to vi
  useEffect(() => {
    if (props.language === 'zh' || !props.language) {
      props.changeLanguage('vi');
      i18n.changeLanguage('vi');
    }
  }, [props.language, props.changeLanguage, i18n]);

  useEffect(() => {
    ApiUtils.getAllChampionsByCache()
      .then(data => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, props.language === 'zh' ? 'zh-Hant' : props.language === 'vi' ? 'vi-VN' : 'en'));
        setChampionsList(sorted);
      })
      .catch(err => console.error("Error loading champions list", err));
  }, [props.language]);

  const handleApplyBackground = async () => {
    if (!props.lobbyBackgroundChampId) return;
    try {
      const skinId = Number(props.lobbyBackgroundChampId) * 1000;
      await ApiUtils.postSummonerProfile("backgroundSkinId", skinId);
      messageApi.open({
        type: 'success',
        content: t('main.backgroundSuccess')
      });
    } catch (e) {
      console.error(e);
      messageApi.open({
        type: 'error',
        content: t('main.backgroundError')
      });
    }
  };

  const getStatusColor = (state) => {
    if (!state) return '#ff4d4f';
    const stateStr = state.toString().toLowerCase();
    if (stateStr.includes('chưa') || stateStr.includes('tắt') || stateStr.includes('not open') || stateStr.includes('closed')) {
      return '#ff4d4f'; 
    }
    if (stateStr.includes('khởi động') || stateStr.includes('starting')) {
      return '#faad14'; 
    }
    return '#52c41a'; 
  };

  const statusColor = getStatusColor(props.appState);

  const spellOptions = [
    { value: 4, label: 'Tốc Biến (Flash)' },
    { value: 14, label: 'Thiêu Đốt (Ignite)' },
    { value: 12, label: 'Dịch Chuyển (Teleport)' },
    { value: 11, label: 'Trừng Phạt (Smite)' },
    { value: 7, label: 'Hồi Máu (Heal)' },
    { value: 21, label: 'Lá Chắn (Barrier)' },
    { value: 6, label: 'Tốc Hành (Ghost)' },
    { value: 3, label: 'Kiệt Sức (Exhaust)' },
    { value: 1, label: 'Thanh Tẩy (Cleanse)' }
  ];

  const runeOptions = [
    { value: 'ad', label: 'AD / Chuẩn Xác (Chinh Phục)' },
    { value: 'ap', label: 'AP / Pháp Thuật (Thiên Thạch)' },
    { value: 'assassin', label: 'Sát Thủ / Áp Đảo (Sốc Điện)' },
    { value: 'tank', label: 'Đỡ Đòn / Kiên Định (Dư Chấn)' },
    { value: 'support', label: 'Hỗ Trợ / Cảm Hứng (Nâng Cấp Băng)' }
  ];

  // Auto Login local input states
  const [inputUser, setInputUser] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [editPath, setEditPath] = useState(false);
  const [clientPath, setClientPath] = useState(props.riotClientPath || 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe');

  useEffect(() => {
    if (props.riotClientPath) {
      setClientPath(props.riotClientPath);
    }
  }, [props.riotClientPath]);

  const triggerSaveConfig = (updatedAccounts, updatedPath) => {
    ipcRenderer.send('set-config', {
      isAutoAccept: props.isAutoAccept,
      isShowRecentTeammate: props.isShowRecentTeammate,
      recentTeammateCheckGameCount: props.recentTeammateCheckGameCount,
      isShowTeammateRanked: props.isShowTeammateRanked,
      showTeammateRankedType: props.showTeammateRankedType,
      isHovercard: props.isHovercard,
      hovercardTierType: props.hovercardTierType,
      hovercardRankedType: props.hovercardRankedType,
      language: props.language,
      isDarkMode: props.isDarkMode,
      isAutoPick: props.isAutoPick,
      autoPickChampionId: props.autoPickChampionId,
      isAutoBan: props.isAutoBan,
      autoBanChampionId: props.autoBanChampionId,
      isAutoChat: props.isAutoChat,
      autoChatContent: props.autoChatContent,
      isAutoSpellsRunes: props.isAutoSpellsRunes,
      selectedSpell1: props.selectedSpell1,
      selectedSpell2: props.selectedSpell2,
      selectedRunePreset: props.selectedRunePreset,
      isAutoRequeue: props.isAutoRequeue,
      isOfflineMode: props.isOfflineMode,
      lobbyBackgroundChampId: props.lobbyBackgroundChampId,
      accounts: updatedAccounts !== undefined ? updatedAccounts : (props.accounts || []),
      riotClientPath: updatedPath !== undefined ? updatedPath : (props.riotClientPath || 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe')
    });
  };

  const handleAddAccount = () => {
    if (!inputUser || !inputPass) {
      messageApi.open({
        type: 'warning',
        content: 'Vui lòng nhập tài khoản và mật khẩu!'
      });
      return;
    }
    const newAcc = {
      id: Date.now(),
      username: inputUser,
      password: inputPass,
      note: inputNote || 'Acc ' + ((props.accounts?.length || 0) + 1)
    };
    const updated = [...(props.accounts || []), newAcc];
    props.changeAccounts(updated);
    triggerSaveConfig(updated, clientPath);
    setInputUser('');
    setInputPass('');
    setInputNote('');
    messageApi.open({
      type: 'success',
      content: 'Đã thêm tài khoản mới!'
    });
  };

  const handleDeleteAccount = (id) => {
    const updated = (props.accounts || []).filter(a => a.id !== id);
    props.changeAccounts(updated);
    triggerSaveConfig(updated, clientPath);
    messageApi.open({
      type: 'success',
      content: 'Đã xóa tài khoản!'
    });
  };

  const handleSavePath = () => {
    props.changeRiotClientPath(clientPath);
    triggerSaveConfig(props.accounts || [], clientPath);
    setEditPath(false);
    messageApi.open({
      type: 'success',
      content: 'Đã cập nhật đường dẫn Riot Client!'
    });
  };

  const handleRiotLogin = (acc) => {
    ipcRenderer.send('riot-login', {
      username: acc.username,
      password: acc.password,
      riotClientPath: clientPath
    });
    messageApi.open({
      type: 'loading',
      content: `Đang dọn dẹp tiến trình & tự động đăng nhập: ${acc.note}...`,
      duration: 3
    });
  };

  // Compact glassmorphic styles
  const cardStyle = {
    background: 'rgba(21, 28, 41, 0.45)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(200, 170, 110, 0.12)',
    boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
    borderRadius: '10px',
    marginBottom: '10px',
  };

  const headerCardStyle = {
    background: 'rgba(11, 18, 32, 0.8)',
    border: `1px solid ${statusColor}44`,
    borderRadius: '10px',
    padding: '8px 16px',
    boxShadow: `0 0 15px ${statusColor}18`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  };

  const switchContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    background: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.02)'
  };

  return (
    <div style={{ paddingBottom: '0.2rem' }}>
      {contextHolder}
      
      {/* Top Status & Settings Bar */}
      <div style={headerCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Badge status="processing" color={statusColor} />
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#e6edf3', letterSpacing: '0.5px' }}>
            {props.appState}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Select 
            size="small"
            style={{ width: 105 }}
            id="language-select"
            value={props.language}
            suffixIcon={<GlobalOutlined style={{ color: '#c8aa6e' }} />}
            options={[
              { value: language.vi, label: 'Tiếng Việt' },
              { value: language.en, label: 'Eng' },
            ]}
            onChange={(value) => {
              i18n.changeLanguage(value)
              props.changeLanguage(value)
              props.changeAppState(props.appStateKey)
            }}
          />
          <Switch 
            size="small"
            checkedChildren="🌙" 
            unCheckedChildren="☀️" 
            checked={props.isDarkMode}
            onChange={(checked) => props.changeIsDarkMode(checked)}
          />
        </div>
      </div>

      {/* 2-Column Dashboard Grid */}
      <Row gutter={[12, 12]}>
        
        {/* LEFT COLUMN: Main Automation Triggers & Champ Select */}
        <Col span={12}>
          
          {/* Card 1: Quick Actions & Basic System Switches */}
          <Card style={cardStyle} bodyStyle={{ padding: '10px' }} size="small" title={<span style={{ color: '#c8aa6e', fontSize: '13px' }}><ThunderboltOutlined /> HỆ THỐNG & ĐIỀU KHIỂN</span>}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              
              {/* Quick Actions Buttons */}
              <Row gutter={8}>
                <Col span={8}>
                  <Button 
                    type="primary" 
                    size="small"
                    style={{ background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)', border: 'none', width: '100%', fontSize: '11px', fontWeight: 'bold' }}
                    onClick={() => {
                      ApiUtils.postAcceptMatchmaking()
                      trackEvent('manual_accept_match');
                    }}
                  >
                    Chấp Nhận
                  </Button>
                </Col>
                <Col span={8}>
                  <Button 
                    type="primary" 
                    danger
                    size="small"
                    style={{ background: 'linear-gradient(135deg, #dc3545 0%, #bd2130 100%)', border: 'none', width: '100%', fontSize: '11px', fontWeight: 'bold' }}
                    onClick={() => {
                      props.changeIsAutoAccept(false)
                      ApiUtils.postDeclineMatchmaking()
                      trackEvent('manual_decline_match');
                    }}
                  >
                    Từ Chối
                  </Button>
                </Col>
                <Col span={8}>
                  <Button 
                    type="default" 
                    danger
                    size="small"
                    icon={<PoweroffOutlined />}
                    loading={killLoLLoading} 
                    style={{ border: '1px solid #ff4d4f', color: '#ff4d4f', background: 'transparent', width: '100%', fontSize: '11px' }}
                    onClick={() => {
                      ipcRenderer.send('kill-lol', '');
                      setKillLoLLoading(true);
                      trackEvent('force_close_lol');
                    }}
                  >
                    Tắt LoL
                  </Button>
                </Col>
              </Row>

              {/* Automation Switches */}
              <div style={switchContainerStyle}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{t('main.autoAccept')}</span>
                <Switch size="small" checked={props.isAutoAccept} onChange={(checked) => props.changeIsAutoAccept(checked)}/>
              </div>

              <div style={switchContainerStyle}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{t('main.autoRequeue')}</span>
                <Switch size="small" checked={props.isAutoRequeue} onChange={(checked) => props.changeIsAutoRequeue(checked)}/>
              </div>

              <div style={switchContainerStyle}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{t('main.offlineMode')}</span>
                <Switch size="small" checked={props.isOfflineMode} onChange={(checked) => {
                  props.changeIsOfflineMode(checked);
                  ApiUtils.putChatAvailability(checked ? 'offline' : 'chat');
                }}/>
              </div>

            </Space>
          </Card>

          {/* Card 2: Auto Pick & Auto Ban */}
          <Card style={cardStyle} bodyStyle={{ padding: '10px' }} size="small" title={<span style={{ color: '#c8aa6e', fontSize: '13px' }}><SettingOutlined /> TỰ ĐỘNG CHỌN & CẤM</span>}>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#e6edf3' }}>Khóa tướng</span>
                    <Switch size="small" checked={props.isAutoPick} onChange={(checked) => props.changeIsAutoPick(checked)}/>
                  </div>
                  <Select
                    showSearch
                    size="small"
                    disabled={!props.isAutoPick}
                    style={{ width: '100%' }}
                    placeholder={t('main.pickChamp')}
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    value={props.autoPickChampionId}
                    onChange={(value) => props.changeAutoPickChampionId(value)}
                    options={championsList.map(c => ({ value: Number(c.key), label: c.name }))}
                  />
                </Space>
              </Col>
              
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#e6edf3' }}>Cấm tướng</span>
                    <Switch size="small" checked={props.isAutoBan} onChange={(checked) => props.changeIsAutoBan(checked)}/>
                  </div>
                  <Select
                    showSearch
                    size="small"
                    disabled={!props.isAutoBan}
                    style={{ width: '100%' }}
                    placeholder={t('main.banChamp')}
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    value={props.autoBanChampionId}
                    onChange={(value) => props.changeAutoBanChampionId(value)}
                    options={championsList.map(c => ({ value: Number(c.key), label: c.name }))}
                  />
                </Space>
              </Col>
            </Row>
          </Card>

        </Col>

        {/* RIGHT COLUMN: Spells, Runes, Chat & Customizations */}
        <Col span={12}>
          
          {/* Card 3: Auto Runes & Spells Setup */}
          <Card style={cardStyle} bodyStyle={{ padding: '10px' }} size="small" title={<span style={{ color: '#c8aa6e', fontSize: '13px' }}><ThunderboltOutlined /> CÀI PHÉP & NGỌC BỔ TRỢ</span>}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>Kích hoạt nạp nhanh</span>
                <Switch size="small" checked={props.isAutoSpellsRunes} onChange={(checked) => props.changeIsAutoSpellsRunes(checked)}/>
              </div>
              <Row gutter={8}>
                <Col span={12}>
                  <span style={{ color: '#8b949e', fontSize: '11px', display: 'block', marginBottom: '2px' }}>{t('main.spell1')}</span>
                  <Select
                    size="small"
                    disabled={!props.isAutoSpellsRunes}
                    style={{ width: '100%' }}
                    value={props.selectedSpell1}
                    onChange={(value) => props.changeSelectedSpell1(value)}
                    options={spellOptions}
                  />
                </Col>
                
                <Col span={12}>
                  <span style={{ color: '#8b949e', fontSize: '11px', display: 'block', marginBottom: '2px' }}>{t('main.spell2')}</span>
                  <Select
                    size="small"
                    disabled={!props.isAutoSpellsRunes}
                    style={{ width: '100%' }}
                    value={props.selectedSpell2}
                    onChange={(value) => props.changeSelectedSpell2(value)}
                    options={spellOptions}
                  />
                </Col>
              </Row>
              <div>
                <span style={{ color: '#8b949e', fontSize: '11px', display: 'block', marginBottom: '2px' }}>{t('main.runePreset')}</span>
                <Select
                  size="small"
                  disabled={!props.isAutoSpellsRunes}
                  style={{ width: '100%' }}
                  value={props.selectedRunePreset}
                  onChange={(value) => props.changeSelectedRunePreset(value)}
                  options={runeOptions}
                />
              </div>
            </Space>
          </Card>

          {/* Card 4: Lobby Customizer & Auto Chat */}
          <Card style={cardStyle} bodyStyle={{ padding: '10px' }} size="small" title={<span style={{ color: '#c8aa6e', fontSize: '13px' }}><SkinOutlined /> SẢNH & TỰ ĐỘNG CHAT</span>}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {/* Lobby background */}
              <Row gutter={6} align="middle">
                <Col span={16}>
                  <Select
                    showSearch
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="Ảnh nền Profile"
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    value={props.lobbyBackgroundChampId}
                    onChange={(value) => props.changeLobbyBackgroundChampId(value)}
                    options={championsList.map(c => ({ value: Number(c.key), label: c.name }))}
                  />
                </Col>
                <Col span={8}>
                  <Button type="primary" size="small" onClick={handleApplyBackground} style={{ width: '100%', fontSize: '11px' }}>
                    Áp dụng
                  </Button>
                </Col>
              </Row>

              {/* Auto Chat */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Input
                  size="small"
                  disabled={!props.isAutoChat}
                  placeholder={t('main.chatPlaceholder')}
                  value={props.autoChatContent}
                  onChange={(e) => props.changeAutoChatContent(e.target.value)}
                  style={{ flex: 1, borderRadius: '4px' }}
                />
                <Switch size="small" checked={props.isAutoChat} onChange={(checked) => props.changeIsAutoChat(checked)}/>
              </div>
            </Space>
          </Card>

        </Col>
      </Row>

      {/* Auto Login Card */}
      <Card style={cardStyle} bodyStyle={{ padding: '10px' }} size="small" title={<span style={{ color: '#c8aa6e', fontSize: '13px' }}><KeyOutlined /> TỰ ĐỘNG ĐĂNG NHẬP</span>}>
        <Row gutter={[16, 12]}>
          {/* Account list column */}
          <Col span={14}>
            <span style={{ color: '#8b949e', fontSize: '11px', display: 'block', marginBottom: '6px' }}>DANH SÁCH TÀI KHOẢN ĐÃ LƯU</span>
            <div style={{ maxHeight: '110px', overflowY: 'auto', paddingRight: '4px' }}>
              {(!props.accounts || props.accounts.length === 0) ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#8b949e', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px' }}>
                  Chưa có tài khoản nào được lưu. Thêm bên phải.
                </div>
              ) : (
                props.accounts.map(acc => (
                  <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: '6px', marginBottom: '5px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', color: '#e6edf3', fontWeight: 'bold' }}>{acc.note}</span>
                      <span style={{ fontSize: '10px', color: '#8b949e' }}>{acc.username}</span>
                    </div>
                    <Space size={4}>
                      <Button type="primary" size="small" style={{ fontSize: '10px', background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)', border: 'none' }} onClick={() => handleRiotLogin(acc)}>
                        Đăng Nhập
                      </Button>
                      <Button danger type="text" size="small" icon={<DeleteOutlined style={{ fontSize: '12px' }} />} onClick={() => handleDeleteAccount(acc.id)} />
                    </Space>
                  </div>
                ))
              )}
            </div>
          </Col>

          {/* Add account form & path edit */}
          <Col span={10} style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '16px' }}>
            <span style={{ color: '#8b949e', fontSize: '11px', display: 'block', marginBottom: '6px' }}>THÊM TÀI KHOẢN</span>
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
              <Input 
                size="small" 
                placeholder="Tên tài khoản" 
                value={inputUser} 
                onChange={e => setInputUser(e.target.value)} 
                prefix={<UserOutlined style={{ color: '#8b949e', fontSize: '11px' }} />}
              />
              <Input.Password 
                size="small" 
                placeholder="Mật khẩu" 
                value={inputPass} 
                onChange={e => setInputPass(e.target.value)} 
                prefix={<LockOutlined style={{ color: '#8b949e', fontSize: '11px' }} />}
              />
              <Input 
                size="small" 
                placeholder="Tên gợi nhớ (ví dụ: Acc Chính)" 
                value={inputNote} 
                onChange={e => setInputNote(e.target.value)}
              />
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddAccount} style={{ width: '100%', fontSize: '11px', background: 'rgba(200, 170, 110, 0.2)', border: '1px solid rgba(200, 170, 110, 0.4)', color: '#c8aa6e' }}>
                Lưu tài khoản
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Riot client path setting at the bottom of the card */}
        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', fontSize: '11px' }}>
          {editPath ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Input size="small" style={{ flex: 1, fontSize: '10px' }} value={clientPath} onChange={e => setClientPath(e.target.value)} />
              <Button size="small" type="primary" onClick={handleSavePath}>Lưu</Button>
              <Button size="small" onClick={() => { setClientPath(props.riotClientPath || 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe'); setEditPath(false); }}>Hủy</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b949e' }}>
              <span>Đường dẫn Riot Client: <span style={{ color: '#58a6ff', fontFamily: 'monospace' }}>{clientPath}</span></span>
              <a onClick={() => setEditPath(true)} style={{ color: '#c8aa6e' }}>[Sửa]</a>
            </div>
          )}
        </div>
      </Card>

      {/* Ranked Stats & Info Settings (Stretched bottom) */}
      <Card style={cardStyle} bodyStyle={{ padding: '8px 12px' }} size="small" title={<span style={{ color: '#c8aa6e', fontSize: '13px' }}><BarChartOutlined /> XẾP HẠNG ĐỒNG ĐỘI</span>}>
        <Row gutter={[16, 8]} align="middle">
          <Col xs={24} md={10}>
            <Space>
              <Switch size="small" id="teammate-ranked-stats-btn" checked={props.isShowTeammateRanked}
                      onChange={(checked) => props.changeIsShowTeammateRanked(checked)}/>
              <label htmlFor="teammate-ranked-stats-btn"
                     style={{ userSelect: "none", color: '#8b949e', cursor: 'pointer', fontSize: '12px' }}>{t('main.displayTeammateScore')}</label>
            </Space>
          </Col>
          <Col xs={24} md={14} style={{ textAlign: 'right' }}>
            <Radio.Group 
              size="small"
              value={props.showTeammateRankedType} 
              buttonStyle="solid"
              disabled={!props.isShowTeammateRanked}
              onChange={(event) => props.changeShowTeammateRankedType(event.target.value)}
            >
              <Radio.Button value={showTeammateRankedType.SOLO} style={{ fontSize: '11px' }}>{t('main.showTeammateRankedType.soloDuo')}</Radio.Button>
              <Radio.Button value={showTeammateRankedType.FLEX} style={{ fontSize: '11px' }}>{t('main.showTeammateRankedType.flex')}</Radio.Button>
              <Radio.Button value={showTeammateRankedType.BOTH} style={{ fontSize: '11px' }}>{t('main.showTeammateRankedType.both')}</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
      </Card>

      <Hovercard/>
    </div>
  )
}

const mapStateToProps = (state) => {
  return {
    isAutoAccept: state.ConfigReducer.isAutoAccept,
    isShowTeammateRanked: state.ConfigReducer.isShowTeammateRanked,
    showTeammateRankedType: state.ConfigReducer.showTeammateRankedType,
    appState: state.GameReducer.appState,
    appStateKey: state.GameReducer.appStateKey,
    isDarkMode: state.ConfigReducer.isDarkMode,
    language: state.ConfigReducer.language,
    
    // Mapped config options
    isAutoPick: state.ConfigReducer.isAutoPick,
    autoPickChampionId: state.ConfigReducer.autoPickChampionId,
    isAutoBan: state.ConfigReducer.isAutoBan,
    autoBanChampionId: state.ConfigReducer.autoBanChampionId,
    isAutoChat: state.ConfigReducer.isAutoChat,
    autoChatContent: state.ConfigReducer.autoChatContent,
    isAutoSpellsRunes: state.ConfigReducer.isAutoSpellsRunes,
    selectedSpell1: state.ConfigReducer.selectedSpell1,
    selectedSpell2: state.ConfigReducer.selectedSpell2,
    selectedRunePreset: state.ConfigReducer.selectedRunePreset,
    isAutoRequeue: state.ConfigReducer.isAutoRequeue,
    isOfflineMode: state.ConfigReducer.isOfflineMode,
    lobbyBackgroundChampId: state.ConfigReducer.lobbyBackgroundChampId,
    accounts: state.ConfigReducer.accounts,
    riotClientPath: state.ConfigReducer.riotClientPath
  }
}

const mapDispatchToProp = {
  changeIsAutoAccept(data) {
    return {
      type: "change-isAutoAccept",
      data
    }
  },
  changeIsShowTeammateRanked(data) {
    return {
      type: "change-isShowTeammateRanked",
      data
    }
  },
  changeShowTeammateRankedType(data) {
    return {
      type: "change-showTeammateRankedType",
      data
    }
  },
  changeAppState(data) {
    return {
      type: "change-appState",
      data
    }
  },
  changeLanguage(data) {
    return {
      type: "change-language",
      data
    }
  },
  changeIsDarkMode(data) {
    return {
      type: "change-isDarkMode",
      data
    }
  },
  
  // Dispatch actions
  changeIsAutoPick(data) {
    return { type: "change-isAutoPick", data }
  },
  changeAutoPickChampionId(data) {
    return { type: "change-autoPickChampionId", data }
  },
  changeIsAutoBan(data) {
    return { type: "change-isAutoBan", data }
  },
  changeAutoBanChampionId(data) {
    return { type: "change-autoBanChampionId", data }
  },
  changeIsAutoChat(data) {
    return { type: "change-isAutoChat", data }
  },
  changeAutoChatContent(data) {
    return { type: "change-autoChatContent", data }
  },
  changeIsAutoSpellsRunes(data) {
    return { type: "change-isAutoSpellsRunes", data }
  },
  changeSelectedSpell1(data) {
    return { type: "change-selectedSpell1", data }
  },
  changeSelectedSpell2(data) {
    return { type: "change-selectedSpell2", data }
  },
  changeSelectedRunePreset(data) {
    return { type: "change-selectedRunePreset", data }
  },
  changeIsAutoRequeue(data) {
    return { type: "change-isAutoRequeue", data }
  },
  changeIsOfflineMode(data) {
    return { type: "change-isOfflineMode", data }
  },
  changeLobbyBackgroundChampId(data) {
    return { type: "change-lobbyBackgroundChampId", data }
  },
  changeAccounts(data) {
    return { type: "change-accounts", data }
  },
  changeRiotClientPath(data) {
    return { type: "change-riotClientPath", data }
  }
}

export default connect(mapStateToProps, mapDispatchToProp)(withErrorBoundary(Main))