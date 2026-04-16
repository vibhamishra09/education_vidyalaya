import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CacheService } from 'src/redis/cache.service';

@Injectable()
export class SpamService {
  constructor(
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService
  ) {}

  async validateContent(text: string, context: string | undefined, ip:string) {
    const payload = {
      text: text || '',
      context: context || 'general',
    };
    const penaltyKey = `spam_penalty:${ip}`;
    console.log('Sending to Python:', payload);

    try {
      const startTime = Date.now()
      const azureUrl = `${process.env.OLLAMA_PROXY_URL}/api/validate/check`;

      const currentPenalty = await this.cacheService.get<number>(penaltyKey) || 0;

      const request$ = this.httpService.post(azureUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(request$);
      const data = response.data;

      // if (!data.valid) {
      //   const newPenalty = Math.min(currentPenalty + 5, 15);
      //   await this.cacheService.set(penaltyKey, newPenalty, 300);
      //   console.log(`Abuse detected from ${ip}. Applying ${newPenalty}s delay.`);
      //   await new Promise((resolve) => setTimeout(resolve, newPenalty * 1000));
      // }

      data.time = Date.now() - startTime
      return data;

    } catch (error) {
      if (error.response) {
        console.error('FastAPI Error Data:', error.response.data);
      } else {
        console.error('Spam API Connection Error:', error.message);
      }
      
      return { valid: true, score: 0, suggestion: '', reasons: [] };
    }
  }
}