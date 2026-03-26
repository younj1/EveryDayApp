const { withXcodeProject, IOSConfig } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

const EXT_NAME = 'EveryDayWidgets'

module.exports = function withWidgetExtension(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults
    const projectRoot = config.modRequest.projectRoot
    const iosDir = path.join(projectRoot, 'ios')
    const extDir = path.join(iosDir, EXT_NAME)

    if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true })

    const swiftSrc = path.join(projectRoot, `widgets/ios/${EXT_NAME}.swift`)
    const plistSrc = path.join(projectRoot, 'widgets/ios/Info.plist')
    if (fs.existsSync(swiftSrc)) fs.copyFileSync(swiftSrc, path.join(extDir, `${EXT_NAME}.swift`))
    if (fs.existsSync(plistSrc)) fs.copyFileSync(plistSrc, path.join(extDir, 'Info.plist'))

    const bundleId = IOSConfig.BundleIdentifier.getBundleIdentifier(config)
    const target = xcodeProject.addTarget(EXT_NAME, 'app_extension', EXT_NAME, `${bundleId}.widgets`)

    if (target) {
      const uuid = target.uuid
      xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', uuid)
      xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', uuid)
      xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', uuid)

      const groupKey = xcodeProject.findPBXGroupKey({ name: EXT_NAME })
      xcodeProject.addSourceFile(`${EXT_NAME}/${EXT_NAME}.swift`, { target: uuid }, groupKey)

      const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection()
      Object.values(buildConfigs).forEach((cfg) => {
        if (cfg.buildSettings?.PRODUCT_NAME === `"${EXT_NAME}"`) {
          cfg.buildSettings.SWIFT_VERSION = '5.0'
          cfg.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"'
        }
      })
    }

    return config
  })
}
