import { SheriffConfig, sameTag } from '@softarc/sheriff-core';

export const sheriffConfig: SheriffConfig = {
  enableBarrelLess: true,
  modules: {
    'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>'],
    'src/app/shared/<type>': ['domain:shared', 'type:<type>']
  },
  depRules: {
    'domain:*': [sameTag, 'domain:shared'],
    'type:feature': ['type:ui', 'type:data'],
    'type:data': ['type:api'],
    'type:api': ['type:model'],
    'type:model': [],
    root: 'type:feature',
    noTag: ['noTag', 'root']
  }
};