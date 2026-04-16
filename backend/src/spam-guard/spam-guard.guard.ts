// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { SpamGuardService } from './spam-guard.service';

// @Injectable()
// export class SpamGuard implements CanActivate {
//   constructor(private spamGuard: SpamGuardService) {}

//   async canActivate(ctx: ExecutionContext): Promise<boolean> {
//     const req  = ctx.switchToHttp().getRequest();
//     const body = req.body;

//     // check whichever text fields exist in the request body
//     const fieldsToCheck = ['title', 'description', 'message', 'bio', 'name'];
    
//     for (const field of fieldsToCheck) {
//       if (!body[field]) continue;
      
//       const result = await this.spamGuard.check({
//         text:    body[field],
//         context: field === 'message' ? 'chat' : 'title',
//       });

//       if (!result.valid) {
//         await this.spamGuard.applyFriction(result.score);
//       }
//     }

//     return true;
//   }
// }