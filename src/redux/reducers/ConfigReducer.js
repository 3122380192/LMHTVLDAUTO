const ConfigReducer = (prevState = {
  isAutoAccept: true,
  isShowRecentTeammate: true,
  recentTeammateCheckGameCount: 20,
  isShowTeammateRanked: true,
  showTeammateRankedType: showTeammateRankedType.BOTH,
  isHovercard: false,
  hovercardTierType: tierType.CHALLENGER,
  hovercardRankedType: rankedType.SOLO,
  language: language.vi,
  isDarkMode: localStorage.getItem('theme') === 'dark' ? true : false,
  
  // New features configuration
  isAutoPick: false,
  autoPickChampionId: null,
  isAutoBan: false,
  autoBanChampionId: null,
  isAutoChat: false,
  autoChatContent: "",
  isAutoSpellsRunes: false,
  selectedSpell1: 4, // Default Flash
  selectedSpell2: 14, // Default Ignite
  selectedRunePreset: "ad", // ad, ap, assassin, tank, support
  isAutoRequeue: false,
  isOfflineMode: false,
  lobbyBackgroundChampId: null,
  accounts: [],
  riotClientPath: 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe'
}, action) => {
  let newState = {...prevState}
  switch (action.type) {
    case "change-isAutoAccept":
      newState.isAutoAccept = action.data
      return newState
    case "change-isShowRecentTeammate":
      newState.isShowRecentTeammate = action.data
      return newState
    case "change-recentTeammateCheckGameCount":
      newState.recentTeammateCheckGameCount = action.data
      return newState
    case "change-isShowTeammateRanked":
      newState.isShowTeammateRanked = action.data
      return newState
    case "change-showTeammateRankedType":
      newState.showTeammateRankedType = action.data
      return newState
    case "change-isHovercard":
      newState.isHovercard = action.data
      return newState
    case "change-hovercardTierType":
      newState.hovercardTierType = action.data
      return newState
    case "change-hovercardRankedType":
      newState.hovercardRankedType = action.data
      return newState
    case "change-config":
      newState = { ...prevState, ...action.data }
      if (!newState.accounts) newState.accounts = [];
      if (!newState.riotClientPath) newState.riotClientPath = 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe';
      return newState
    case "change-language":
      newState.language = action.data
      return newState
    case "change-isDarkMode":
      newState.isDarkMode = action.data
      return newState
      
    // New feature action handlers
    case "change-isAutoPick":
      newState.isAutoPick = action.data
      return newState
    case "change-autoPickChampionId":
      newState.autoPickChampionId = action.data
      return newState
    case "change-isAutoBan":
      newState.isAutoBan = action.data
      return newState
    case "change-autoBanChampionId":
      newState.autoBanChampionId = action.data
      return newState
    case "change-isAutoChat":
      newState.isAutoChat = action.data
      return newState
    case "change-autoChatContent":
      newState.autoChatContent = action.data
      return newState
    case "change-isAutoSpellsRunes":
      newState.isAutoSpellsRunes = action.data
      return newState
    case "change-selectedSpell1":
      newState.selectedSpell1 = action.data
      return newState
    case "change-selectedSpell2":
      newState.selectedSpell2 = action.data
      return newState
    case "change-selectedRunePreset":
      newState.selectedRunePreset = action.data
      return newState
    case "change-isAutoRequeue":
      newState.isAutoRequeue = action.data
      return newState
    case "change-isOfflineMode":
      newState.isOfflineMode = action.data
      return newState
    case "change-lobbyBackgroundChampId":
      newState.lobbyBackgroundChampId = action.data
      return newState
    case "change-accounts":
      newState.accounts = action.data
      return newState
    case "change-riotClientPath":
      newState.riotClientPath = action.data
      return newState
    default:
      return prevState
  }
}

export const rankedType = Object.freeze({
  SOLO: "RANKED_SOLO_5x5",
  FLEX_SR: "RANKED_FLEX_SR",
  FLEX_TT: "RANKED_FLEX_TT",
  TFT: "RANKED_TFT",
  TFT_DOUBLE_UP: "RANKED_TFT_DOUBLE_UP",
  TFT_TURBO: "RANKED_TFT_TURBO",
});

export const showTeammateRankedType = Object.freeze({
  SOLO: rankedType.SOLO,
  FLEX: rankedType.FLEX_SR,
  BOTH: "RANKED_BOTH",
});

export const tierType = Object.freeze({
  IRON: "Iron",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
  MASTER: "Master",
  GRANDMASTER: "Grandmaster",
  CHALLENGER: "Challenger"
})

export const language = Object.freeze({
  zh: "zh",
  en: "en",
  vi: "vi"
})

export const themeType = Object.freeze({
  DARK: "dark",
  LIGHT: "light",
  SYSTEM: "system"
})

export default ConfigReducer