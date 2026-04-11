import { Room } from 'livekit-client';
const room = new Room();
console.log('Room keys:', Object.keys(room).join(', '));
console.log('Room engine:', !!room.engine);
