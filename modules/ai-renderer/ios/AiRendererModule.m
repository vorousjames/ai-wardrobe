#import <Foundation/Foundation.h>
#import <ExpoModulesCore/ExpoModulesCore.h>
#import "AiRendererModule-Swift.h"

@interface AiRendererModule : EXAppDelegateWrapper
@end

@implementation AiRendererModule

EX_EXPORT_MODULE(AiRenderer);

- (EXModuleRegistry *)moduleRegistry {
  return [super moduleRegistry];
}

@end