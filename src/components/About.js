import React from 'react';
import {connect} from "react-redux";
import {Trans, useTranslation} from 'react-i18next';
import logo from '../resources/logo.png'
import {Image} from "antd";

const _package = require("../../package.json");

function About(props) {
  const {t} = useTranslation();

  return (
    <div>
      <div style={{textAlign: "center", marginTop: 40}}>
        <Image width={200} height={200} style={{userSelect: "none"}} preview={false}
               src={logo}
        />
        <h1 style={{fontSize: "28px", fontWeight: "bold", marginTop: 20}}>{t('about.author')}: Vua Lì Đòn</h1>
        <div style={{marginBottom: 20}}>
          <h3 style={{fontSize: "16px", color: "#8b949e"}}>{t('about.currentVersion')}: v{_package.version}</h3>
        </div>
        <p style={{fontSize: "16px", lineHeight: "1.6", color: "#8b949e", maxWidth: 500, margin: "0 auto"}}>
          <Trans i18nKey="about.help"></Trans>
        </p>
      </div>
    </div>
  )
}

const mapStateToProps = (state) => {
  return {
    gameflowSession: state.GameReducer.gameflowSession
  }
}

export default connect(mapStateToProps)(About)