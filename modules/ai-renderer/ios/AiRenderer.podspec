require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AiRenderer'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platform       = :ios, '14.0'
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/iclawdius-org/ai-wardrobe' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  
  s.script_phase = {
    :name => 'Prepare Swift Package Dependencies',
    :script => <<-SCRIPT
      PACKAGE_JSON_PATH="${PODS_TARGET_SRCROOT}/../package.json"
      if [ -f "$PACKAGE_JSON_PATH" ]; then
        echo "Found package.json, checking for Swift Package dependencies"
      fi
    SCRIPT
  }

  if !$ExpoUseSources.empty? && $ExpoUseSources.include?(s.name)
    s.source_files = '../src/**/*.{swift,h,m,c,cc,cpp}'
  else
    s.source_files = 'AiRenderer/**/*.{swift,h,m,c,cc,cpp}'
  end
end