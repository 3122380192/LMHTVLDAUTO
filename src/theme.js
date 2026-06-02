import React, {useEffect} from 'react'
import {ConfigProvider, theme as AntdTheme} from 'antd'
import {connect} from "react-redux";
import {themeType} from "./redux/reducers/ConfigReducer";

const {ipcRenderer} = window.require('electron')

const ThemeProviderInner = ({children, isDarkMode}) => {
  const {defaultAlgorithm, darkAlgorithm} = AntdTheme

  useEffect(() => {
    ipcRenderer.send('switch-native-theme', isDarkMode ? themeType.DARK : themeType.LIGHT)
    localStorage.setItem('theme', isDarkMode ? themeType.DARK : themeType.LIGHT)
  }, [isDarkMode])

  // Custom premium gaming theme tokens (Hextech style)
  const themeConfig = {
    algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
    token: {
      colorPrimary: '#c8aa6e', // Hextech Gold
      colorLink: '#c8aa6e',
      colorLinkHover: '#e5c583',
      borderRadius: 10,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      colorBgBase: isDarkMode ? '#060a13' : '#f0f2f5',
      colorBgContainer: isDarkMode ? '#0b1220' : '#ffffff',
      colorBgLayout: isDarkMode ? '#030509' : '#f5f7fa',
    },
    components: {
      Card: {
        colorBgContainer: isDarkMode ? 'rgba(11, 18, 32, 0.65)' : 'rgba(255, 255, 255, 0.9)',
        colorBorderSecondary: isDarkMode ? 'rgba(200, 170, 110, 0.18)' : 'rgba(0, 0, 0, 0.08)',
      },
      Button: {
        colorPrimary: '#c8aa6e',
        colorPrimaryHover: '#e5c583',
        borderRadius: 6,
        fontWeight: 600,
      },
      Switch: {
        colorPrimary: '#c8aa6e',
      },
      Menu: {
        colorItemBgSelected: isDarkMode ? 'rgba(200, 170, 110, 0.15)' : 'rgba(200, 170, 110, 0.1)',
        colorItemTextSelected: '#c8aa6e',
        colorItemBgHover: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      }
    }
  }

  return (
    <ConfigProvider theme={themeConfig}>
      {children}
    </ConfigProvider>
  )
}

const mapStateToProps = (state) => {
  return {
    isDarkMode: state.ConfigReducer.isDarkMode
  }
}

const ThemeProvider = connect(mapStateToProps)(({children, ...props}) => {
  return <ThemeProviderInner {...props}>{children}</ThemeProviderInner>;
});

export default ThemeProvider;