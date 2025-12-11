import { Switch } from 'antd'
import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const isEnglish = i18n.language === 'en-US'

  const handleLanguageChange = (checked: boolean) => {
    const lang = checked ? 'en-US' : 'zh-CN'
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    // 不需要刷新页面，ConfigProvider 会根据 i18n.language 自动更新
  }

  return (
    <Switch
      checked={isEnglish}
      onChange={handleLanguageChange}
      checkedChildren="EN"
      unCheckedChildren="中"
      style={{ minWidth: 50 }}
    />
  )
}

