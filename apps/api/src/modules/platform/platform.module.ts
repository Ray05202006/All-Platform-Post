import { Module } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { FacebookService } from './services/facebook.service';
import { TwitterService } from './services/twitter.service';
import { ThreadsService } from './services/threads.service';
import { InstagramService } from './services/instagram.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  providers: [
    PlatformService,
    FacebookService,
    TwitterService,
    ThreadsService,
    InstagramService,
    EncryptionService,
  ],
  exports: [PlatformService],
})
export class PlatformModule {}
