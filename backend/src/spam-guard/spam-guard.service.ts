import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class SpamService {
  constructor(private readonly httpService: HttpService) {}

  async validateContent(text: string, context: string | undefined) {
    const payload = {
      text: text || '',
      context: context || 'general',
    };

    console.log('Sending to Python:', payload);

    try {
      const azureUrl = 'http://127.0.0.1:8000/check';

      const request$ = this.httpService.post(azureUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(request$);
      const data = response.data;

      if (data && data.score > 0.7) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

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