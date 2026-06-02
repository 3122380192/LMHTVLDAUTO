const {Content, Sider} = Layout;
import axios from "axios";
import React, {useEffect, useState} from 'react';
import {Layout, Menu, theme} from 'antd';
import {useTranslation} from 'react-i18next';
import {Routes, Route, useNavigate} from "react-router-dom";
import VisibleSwitch from "./VisibleSwitch";
import GoogleAnalytics from "./GoogleAnalytics";

const _package = require("../../package.json");

const MyLayout = ({children}) => {
  const navigate = useNavigate();
  const {t} = useTranslation();
  const measurementId = 'G-JDEJZFZKCV';// GA4
  const [isNewVersionAvailable, setIsNewVersionAvailable] = useState(false);

  useEffect(() => {
    const parseVersion = (versionString) => {
      if (versionString.startsWith('v')) {
        console.log("versionString:", versionString)
        return versionString.substring(1);
      }
      return versionString;
    };

    const compareVersions = (current, latest) => {
      const currentParts = current.split('.').map(Number);
      const latestParts = latest.split('.').map(Number);
      for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;
        if (currentPart < latestPart) return true;
        if (currentPart > latestPart) return false;
      }
      return false;
    };

    const checkForNewVersion = () => {
      setIsNewVersionAvailable(false);
    };
    checkForNewVersion();
    document.title = "Auto Vua Lì Đòn v" + _package.version;
  }, []);


  useEffect(() => {
    if (location.pathname === '/' || location.pathname.includes('index.html')) {
      navigate('/main', {replace: true});
    }
  }, [location, navigate]);

  const getItem = (label, key) => {
    return {
      key,
      label,
    };
  };

  const items = [
    getItem(t('menu.main'), '/main'),
    getItem(t('menu.duo'), '/duo'),
    getItem(t('menu.rank'), '/rank'),
    getItem(t('menu.recentPlayers'), '/recentPlayers'),
    getItem(t('menu.aram'), '/aram'),
    getItem(t('menu.selectedRole'), '/selectedRole'),
    getItem(isNewVersionAvailable ? "✨ " + t('menu.about') : t('menu.about'), '/about'),
  ];

  return (
    <Layout style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1a2333 0%, #0d121d 50%, #05070c 100%)',
    }}>
      <Sider 
        width={125} 
        style={{
          background: 'rgba(11, 18, 32, 0.45)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(200, 170, 110, 0.15)',
        }}
      >
        <Menu
          mode="inline"
          defaultSelectedKeys={['/main']}
          defaultOpenKeys={['/main']}
          style={{
            height: '100%',
            borderRight: 0,
            userSelect: "none",
            background: 'transparent',
            paddingTop: '12px',
          }}
          items={items}
          onClick={(item) => {
            navigate(item.key)
          }}
        />
      </Sider>
      <Layout style={{ padding: '12px 16px 16px', background: 'transparent' }}>
        <Content
          style={{
            padding: '16px 20px',
            minHeight: "92vh",
            background: 'rgba(11, 18, 32, 0.65)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(200, 170, 110, 0.12)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
            overflow: 'auto',
          }}
        >
          {children}
          <GoogleAnalytics measurementId={measurementId}/>
          <Routes>
            <Route path="/*" element={<VisibleSwitch/>}/>
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default MyLayout;