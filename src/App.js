import React, {useEffect, useRef, useState} from 'react';
import Layout from "./components/Layout";
import AuthScreen from "./components/AuthScreen";
import {connect} from "react-redux";
import {showTeammateRankedType} from "./redux/reducers/ConfigReducer"
import ApiUtils from "./api/api-utils";
import RecentTeammatesService from './services/recentTeammatesService'
import {gamePhaseToAppState} from "./redux/reducers/GameReducer";
import {addSummoner} from "./components/common/summonerUtils";
import store from './redux/store'
import {useTranslation} from 'react-i18next';
import {trackEvent} from './components/GoogleAnalytics';
import Test from './components/Test'

const _package = require("../package.json");
const {ipcRenderer} = window.require('electron');

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

const App = (props) => {
  const {t, i18n} = useTranslation();
  const [isInitConfigUpdated, setIsInitConfigUpdated] = useState(false);  // 用於觸發渲染後的動作

  const [authState, setAuthState] = useState({ checking: true, status: 'pending', hwid: '' });
  const [updateState, setUpdateState] = useState({ required: false, version: '', url: '', message: '' });

  // Listen for update requirements
  useEffect(() => {
    const handleUpdateRequired = (event, data) => {
      console.log('Received message [update-required]:', data);
      setUpdateState({
        required: true,
        version: data.version,
        url: data.url,
        message: data.message
      });
    };
    ipcRenderer.on('update-required', handleUpdateRequired);
    return () => {
      ipcRenderer.removeListener('update-required', handleUpdateRequired);
    };
  }, []);

  // Verify device authorization and poll if pending
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await ipcRenderer.invoke('check-auth');
        setAuthState({ checking: false, status: res.status, hwid: res.hwid, error: res.error });
        return res.status;
      } catch (err) {
        console.error("IPC invoke failed:", err);
        setAuthState({ checking: false, status: 'error', error: err.message, hwid: '' });
        return 'error';
      }
    };

    checkAuth().then((status) => {
      if (status !== 'active') {
        const interval = setInterval(async () => {
          const currentStatus = await checkAuth();
          if (currentStatus === 'active') {
            clearInterval(interval);
          }
        }, 2500);
        return () => clearInterval(interval);
      }
    });
  }, []);

  // 解決set-config中props.appStateKey初始化值不會更新的問題
  const appStateKeyRef = useRef(props.appStateKey);
  useEffect(() => {
    appStateKeyRef.current = props.appStateKey;
  }, [props.appStateKey]);

  // References for pick/ban, runes, spells, chat logic to avoid duplicate calls
  const lastActionIdRef = useRef(null);
  const runesAppliedRef = useRef(false);
  const spellsAppliedRef = useRef(false);
  const chatSentRef = useRef(false);

  // Reset references when gamePhase is not ChampSelect
  useEffect(() => {
    if (props.gamePhase !== 'ChampSelect') {
      lastActionIdRef.current = null;
      runesAppliedRef.current = false;
      spellsAppliedRef.current = false;
      chatSentRef.current = false;
    }
  }, [props.gamePhase]);

  const handleAutoPickBanSpellsRunes = async (session) => {
    if (!session || !session.actions) return;
    const localCellId = session.localPlayerCellId;
    
    // Find active action for local player
    let myActiveAction = null;
    for (const actionGroup of session.actions) {
      for (const action of actionGroup) {
        if (action.actorCellId === localCellId && !action.completed && action.isInProgress) {
          myActiveAction = action;
          break;
        }
      }
      if (myActiveAction) break;
    }

    // 1. Handle Auto Pick / Auto Ban
    if (myActiveAction) {
      const actionId = myActiveAction.id;
      // Run only once per active action ID to avoid spamming
      if (lastActionIdRef.current !== actionId) {
        if (myActiveAction.type === 'ban' && props.isAutoBan && props.autoBanChampionId) {
          lastActionIdRef.current = actionId;
          const banId = Number(props.autoBanChampionId);
          console.log(`Auto Banning champion: ${banId}`);
          try {
            await ApiUtils.patchChampSelectAction(actionId, banId);
            await ApiUtils.postChampSelectActionComplete(actionId);
            trackEvent('auto_ban_success');
          } catch (e) {
            console.error("Auto ban failed", e);
            lastActionIdRef.current = null; // retry
          }
        } else if (myActiveAction.type === 'pick' && props.isAutoPick && props.autoPickChampionId) {
          lastActionIdRef.current = actionId;
          const pickId = Number(props.autoPickChampionId);
          console.log(`Auto Picking champion: ${pickId}`);
          try {
            await ApiUtils.patchChampSelectAction(actionId, pickId);
            await ApiUtils.postChampSelectActionComplete(actionId);
            trackEvent('auto_pick_success');
          } catch (e) {
            console.error("Auto pick failed", e);
            lastActionIdRef.current = null; // retry
          }
        }
      }
    }

    // 2. Handle Auto Spells & Runes (Apply once when entering champ select)
    if (props.isAutoSpellsRunes) {
      if (!spellsAppliedRef.current && props.selectedSpell1 && props.selectedSpell2) {
        spellsAppliedRef.current = true;
        console.log(`Applying spells: ${props.selectedSpell1}, ${props.selectedSpell2}`);
        ApiUtils.patchChampSelectSpells(props.selectedSpell1, props.selectedSpell2)
          .catch(err => {
            console.error("Failed to apply spells", err);
            spellsAppliedRef.current = false;
          });
      }

      if (!runesAppliedRef.current && props.selectedRunePreset) {
        runesAppliedRef.current = true;
        
        // Define rune presets
        const runePresets = {
          ad: {
            name: "Auto AD/Precision",
            primary: 8000,
            sub: 8300,
            perks: [8010, 9111, 9104, 8014, 8304, 8345, 5005, 5008, 5008]
          },
          ap: {
            name: "Auto AP/Sorcery",
            primary: 8200,
            sub: 8300,
            perks: [8229, 8226, 8210, 8237, 8345, 8347, 5008, 5008, 5002]
          },
          assassin: {
            name: "Auto Domination",
            primary: 8100,
            sub: 8000,
            perks: [8112, 8126, 8138, 8106, 9111, 8009, 5008, 5008, 5002]
          },
          tank: {
            name: "Auto Tank/Resolve",
            primary: 8400,
            sub: 8000,
            perks: [8437, 8401, 8444, 8451, 9111, 8299, 5007, 5002, 5002]
          },
          support: {
            name: "Auto Inspiration",
            primary: 8300,
            sub: 8400,
            perks: [8351, 8306, 8345, 8347, 8401, 8451, 5007, 5008, 5002]
          }
        };

        const selectedPreset = runePresets[props.selectedRunePreset];
        if (selectedPreset) {
          console.log(`Applying runes preset: ${props.selectedRunePreset}`);
          ApiUtils.putRunePage(selectedPreset.name, selectedPreset.primary, selectedPreset.sub, selectedPreset.perks)
            .catch(err => {
              console.error("Failed to apply runes", err);
              runesAppliedRef.current = false;
            });
        }
      }
    }
  };

  useEffect(() => {
    ipcRenderer.on('auth', async (event, data) => {
      console.log('Received message [auth]:', data);
      props.changeAuth(data)
      let phase = ''
      await ApiUtils.getGameflowPhase()
        .then(response => {
          // console.log(response.data)
          phase = response.data
          console.log('Received message [auth]: props.changeAppState ', phase);
          props.changeAppState(gamePhaseToAppState(phase))
          props.changeGamePhase(data)
        })
        .catch(error => console.log(error))
      ipcRenderer.send('auth-ack', phase);

      // Apply Offline Mode if enabled
      if (props.isOfflineMode) {
        setTimeout(() => {
          ApiUtils.putChatAvailability('offline');
        }, 2000);
      }
    });

    ipcRenderer.on('InProgress', async (event, data) => {
      console.log('Received message [InProgress]:', data);
      props.changeAppState(gamePhaseToAppState("InProgress"))
      props.changeGamePhase(data)
      ApiUtils.getGameflowSession()
        .then(response => {
          console.log("getGameflowSession ", response.data);
          delete response.data.map.assets
          props.changeGameflowSession(response.data)
        })
        .catch(error => console.error(error));
    });
    ipcRenderer.on('GameStart', async (event, data) => {
      console.log('Received message [GameStart]:', data);
      props.changeGamePhase(data)
      props.changeAppState(gamePhaseToAppState("GameStart"))
    });
    ipcRenderer.on('PreEndOfGame', async (event, data) => {
      console.log('Received message [PreEndOfGame]:', data);
      props.changeGamePhase(data)
      props.changeAppState(gamePhaseToAppState("PreEndOfGame"))
    });
    ipcRenderer.on('EndOfGame', async (event, data) => {
      console.log('Received message [EndOfGame]:', data);
      props.changeGamePhase(data)
      props.changeAppState(gamePhaseToAppState("EndOfGame"))
    });
    ipcRenderer.on('None', async (event, data) => {
      console.log('Received message [None]:', data);
      props.changeGamePhase(data)
      props.changeAppState(gamePhaseToAppState("None"))
    });
    ipcRenderer.on('Matchmaking', async (event, data) => {
      console.log('Received message [Matchmaking]:', data);
      props.changeGamePhase(data)
      props.changeAppState(gamePhaseToAppState("Matchmaking"))
    });

    ipcRenderer.on('lol-connect', async (event, data) => {
      console.log('Received message [lol-connect]:', data);
      props.changeAppState('main.appStates.lolStarting')
    });
    ipcRenderer.on('lol-disconnect', async (event, data) => {
      console.log('Received message [lol-disconnect]:', data);
      props.changeAppState('main.appStates.lolClosed')
    });


    ipcRenderer.on('champ-select-session', async (event, data) => {
      console.log('Received message [champ-select-session]:', data);
      props.changeChampSelectSession(data)
      if (data?.chatDetails?.multiUserChatId) {
        props.changeChatRoomId(data.chatDetails.multiUserChatId);
        
        // Auto Chat Lobby logic
        if (props.isAutoChat && props.autoChatContent && !chatSentRef.current) {
          chatSentRef.current = true;
          setTimeout(() => {
            ApiUtils.postConversations(props.autoChatContent);
          }, 1500);
        }
      }
      handleAutoPickBanSpellsRunes(data);
    });

    ipcRenderer.on('lobby-comms-members', async (event, data) => {
      console.log('Received message [lobby-comms-members]:', data);
      props.changeLobbyMembers(data.players || {})
    });
  }, [props.isOfflineMode, props.isAutoChat, props.autoChatContent, props.isAutoPick, props.autoPickChampionId, props.isAutoBan, props.autoBanChampionId, props.isAutoSpellsRunes, props.selectedSpell1, props.selectedSpell2, props.selectedRunePreset]);

  //測試用
  useEffect(() => {
    const handleEvent = (event, data) => {
      console.log('Received message [Lobby]:', data);
      props.changeGamePhase(data)
      props.changeAppState(gamePhaseToAppState("Lobby"))
      
      // Auto Requeue logic
      if (props.isAutoRequeue) {
        console.log("Auto Requeue starting matchmaking search...");
        setTimeout(() => {
          ApiUtils.postStartMatchmaking();
        }, 1000);
      }
    };
    ipcRenderer.on('Lobby', handleEvent);
    return () => {
      ipcRenderer.removeListener('Lobby', handleEvent);
    }
  }, [props.isAutoRequeue]);

  useEffect(() => {
    const handleEvent = (event, data) => {
      console.log('Received message [ReadyCheck]:', data);
      props.changeGamePhase(data)
      props.changeAppState(gamePhaseToAppState("ReadyCheck"))
      if (props.isAutoAccept) {
        ApiUtils.postAcceptMatchmaking();
        trackEvent('auto_accept_match')
      }
    }
    ipcRenderer.on('ReadyCheck', handleEvent);
    return () => {
      ipcRenderer.removeListener('ReadyCheck', handleEvent);
    }
  }, [props.isAutoAccept]);

  useEffect(() => {
    const handleEvent = (event, data) => {
      console.log('Received message [ChampSelect]:', data);
      props.changeGamePhase(data)
      props.changeAppState(gamePhaseToAppState("ChampSelect"))
      ApiUtils.getChampSelectSession()
        .then(response => {
          console.log('getChampSelectSession ', response.data);
          props.changeChampSelectSession(response.data)
          props.changeChatRoomId(response.data.chatDetails.multiUserChatId)
          if (props.isShowTeammateRanked) {
            showTeammateRankedStats(response.data)
          }
        })
        .catch(error => console.error(error));
    }
    ipcRenderer.on('ChampSelect', handleEvent);
    return () => {
      ipcRenderer.removeListener('ChampSelect', handleEvent);
    }
  }, [props.isShowTeammateRanked, props.showTeammateRankedType]);

  useEffect(() => {
    const handleEvent = (event, data) => {
      console.log('Received message [champ-select-summoners]:', data);
      let myTeam = addSummoner(props.myTeam, data)
      props.changeMyTeam(myTeam)
    }
    ipcRenderer.on('champ-select-summoners', handleEvent);
    return () => {
      ipcRenderer.removeListener('champ-select-summoners', handleEvent);
    }
  }, [props.myTeam]);

  useEffect(() => {
    const currentVersion = _package.version; // 確保這裡能正確獲取到版本號

    const handleEvent = async (event, data) => {
      console.log('Received message [set-config]:', data);
      if (data) {
        console.log('changeConfig ', data);
        console.log('changeConfig appStateKeyRef.current', appStateKeyRef.current);
        props.changeConfig(data)
        i18n.changeLanguage(data.language)
        props.changeAppState(appStateKeyRef.current)
        const eventData = {...data, version: currentVersion};
        trackEvent('app_start', eventData);
      } else {
        trackEvent('app_start', {version: currentVersion});
        ipcRenderer.send('set-config', store.getState().ConfigReducer); // 給預設設定檔
      }
      await sleep(300)
      setIsInitConfigUpdated(true);
    }
    ipcRenderer.on('set-config', handleEvent);
    return () => {
      ipcRenderer.removeListener('set-config', handleEvent);
    }
  }, []);

  // 當狀態更新後，發送 ack 訊息
  useEffect(() => {
    if (isInitConfigUpdated) {
      ipcRenderer.send('init-set-config-ack', true);
    }
  }, [isInitConfigUpdated]);  // 依賴於 isInitConfigUpdated，當其變為 true 時觸發

  useEffect(() => {
    const startTime = Date.now();
    const sendCloseEvent = () => {
      try {
        const endTime = Date.now();
        const durationInSeconds = Math.round((endTime - startTime) / 1000);
        const durationFormatted = formatDuration(durationInSeconds);
        trackEvent('app_close', {duration: durationInSeconds, duration_formatted: durationFormatted});
      } catch (error) {
        console.error('Error sending app_close event:', error);
      }
    };

    const handleEvent = (event, data) => {
      console.log('Received message [get-config] ', store.getState().ConfigReducer);
      sendCloseEvent()
      ipcRenderer.send('set-config', store.getState().ConfigReducer);
    }
    ipcRenderer.on('get-config', handleEvent);
    return () => {
      ipcRenderer.removeListener('get-config', handleEvent);
    }
  }, []);

  useEffect(() => {

    }, []);


  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function showTeammateRankedStats(response) {
    await sleep(3000)
    let queueTypes = [];
    switch (props.showTeammateRankedType) {
      case showTeammateRankedType.SOLO:
        queueTypes.push({type: showTeammateRankedType.SOLO, label: t('main.rankedType.soloDuo')});
        break;
      case showTeammateRankedType.FLEX:
        queueTypes.push({type: showTeammateRankedType.FLEX, label: t('main.rankedType.flex')});
        break;
      case showTeammateRankedType.BOTH:
        queueTypes.push(
          {type: showTeammateRankedType.SOLO, label: t('main.rankedType.soloDuo')},
          {type: showTeammateRankedType.FLEX, label: t('main.rankedType.flex')}
        );
        break;
      default:
        queueTypes.push({type: showTeammateRankedType.SOLO, label: t('main.rankedType.soloDuo')});
    }
    let conversationString = "";
    for (const queueType of queueTypes) {
      conversationString += queueType.label + "\n";
      for (const element of response.myTeam) {
        if (element.summonerId === 0) continue;
        const s = await getRankedStatsSummary(element.summonerId, queueType.type);
        conversationString += s + "\n";
      }
    }
    console.log(`showTeammateRankedStats conversationString:\n${conversationString}`);
    ApiUtils.postConversations(conversationString.trim());
  }

  async function getRankedStatsSummary(summonerId, queueType) {
    let summoner = await ApiUtils.getSummonersById(summonerId)
    let rankStats = await ApiUtils.getRankedStats(summonerId)
    console.log("rankStats: ", rankStats)
    let queue = rankStats.queues.find(q => q.queueType === queueType);
    // console.log("queue: ", queue)
    if (queue) {
      return `${summoner[0].gameName ?? summoner[0].displayName} ${queue.tier} ${queue.division} ${queue.leaguePoints} ${queue.miniSeriesProgress} wins:${queue.wins}`;
    } else {
      return '';
    }
  }

  if (updateState.required) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0d1117',
        color: '#e6edf3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <div style={{
          background: 'rgba(21, 28, 41, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(200, 170, 110, 0.25)',
          padding: '40px 30px',
          borderRadius: '12px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
        }}>
          <h2 style={{ color: '#ff4d4f', marginBottom: '15px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            🚨 YÊU CẦU CẬP NHẬT PHIÊN BẢN MỚI
          </h2>
          
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c8aa6e', marginBottom: '15px' }}>
            Phiên bản: v{updateState.version}
          </div>

          <p style={{ color: '#8b949e', fontSize: '13px', lineHeight: '1.6', marginBottom: '30px' }}>
            {updateState.message || "Bạn đang sử dụng phiên bản cũ. Vui lòng tải phiên bản mới nhất để tiếp tục sử dụng dịch vụ."}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => ipcRenderer.send('open-link', updateState.url)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #c8aa6e 0%, #a3803d 100%)',
                color: '#0d1117',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Tải Bản Cập Nhật Mới
            </button>
            
            <button 
              onClick={() => ipcRenderer.send('exit-app')}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ff4d4f',
                border: '1px solid rgba(255, 77, 79, 0.2)',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              Thoát Ứng Dụng
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState.status !== 'active') {
    return <AuthScreen authState={authState} />;
  }

  return (
    <Layout>
      <RecentTeammatesService/>
      {
        ApiUtils.checkIsDev() && <Test/>
      }
    </Layout>
  )
};

const mapStateToProps = (state) => {
  return {
    isAutoAccept: state.ConfigReducer.isAutoAccept,
    isShowTeammateRanked: state.ConfigReducer.isShowTeammateRanked,
    showTeammateRankedType: state.ConfigReducer.showTeammateRankedType,
    appState: state.GameReducer.appState,
    appStateKey: state.GameReducer.appStateKey,
    myTeam: state.GameReducer.myTeam,
    gamePhase: state.GameReducer.gamePhase,
    
    // New configurations mapped to props
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
    isOfflineMode: state.ConfigReducer.isOfflineMode
  }
}

const mapDispatchToProp = {
  changeGameflowSession(data) {
    return {
      type: "change-gameflowSession",
      data
    }
  },
  changeChampSelectSession(data) {
    return {
      type: "change-champSelectSession",
      data
    }
  },
  changeAuth(data) {
    return {
      type: "change-auth",
      data
    }
  },
  changeChatRoomId(data) {
    return {
      type: "change-chatRoomId",
      data
    }
  },
  changeAppState(data) {
    return {
      type: "change-appState",
      data
    }
  },
  changeMyTeam(data) {
    return {
      type: "change-myTeam",
      data
    }
  },
  changeGamePhase(data) {
    return {
      type: "change-gamePhase",
      data
    }
  },
  changeConfig(data) {
    return {
      type: "change-config",
      data
    }
  },
  changeLobbyMembers(data) {
    return {
      type: "change-lobby-members",
      data
    }
  }
}
export default connect(mapStateToProps, mapDispatchToProp)(App);