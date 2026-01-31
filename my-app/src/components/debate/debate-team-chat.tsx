'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Send, MessageSquare, Lock } from 'lucide-react';
import { TeamChatMessage, DebateSide } from '@/types/debate.types';

interface DebateTeamChatProps {
  messages: TeamChatMessage[];
  onSendMessage: (message: string) => void;
  userSide: DebateSide | null;
  currentUserId?: string;
  className?: string;
}

export function DebateTeamChat({
  messages,
  onSendMessage,
  userSide,
  currentUserId,
  className,
}: DebateTeamChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !userSide) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filter messages for user's team only
  const teamMessages = messages.filter((m) => m.side === userSide);

  if (!userSide) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Join a team to access team chat</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2 border-b">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" />
          <span>Team Chat</span>
          <div
            className={cn(
              'w-2 h-2 rounded-full ml-auto',
              userSide === DebateSide.FOR ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span
            className={cn(
              'text-xs',
              userSide === DebateSide.FOR ? 'text-green-600' : 'text-red-600'
            )}
          >
            {userSide}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {teamMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">
                Chat privately with your team members
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isOwnMessage={message.participantId === currentUserId}
                  userSide={userSide}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message your team..."
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              size="icon"
              className={cn(
                userSide === DebateSide.FOR
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChatMessageProps {
  message: TeamChatMessage;
  isOwnMessage: boolean;
  userSide: DebateSide;
}

function ChatMessage({ message, isOwnMessage, userSide }: ChatMessageProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        isOwnMessage ? 'items-end' : 'items-start'
      )}
    >
      {!isOwnMessage && (
        <span className="text-xs text-muted-foreground px-2">
          {message.participantName}
        </span>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2',
          isOwnMessage
            ? userSide === DebateSide.FOR
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
            : 'bg-muted'
        )}
      >
        <p className="text-sm break-words">{message.message}</p>
      </div>
      <span className="text-xs text-muted-foreground px-2">{formattedTime}</span>
    </div>
  );
}

// Minimal chat for sidebar
interface CompactTeamChatProps {
  messages: TeamChatMessage[];
  onSendMessage: (message: string) => void;
  userSide: DebateSide | null;
}

export function CompactTeamChat({
  messages,
  onSendMessage,
  userSide,
}: CompactTeamChatProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || !userSide) return;
    onSendMessage(input.trim());
    setInput('');
  };

  if (!userSide) return null;

  const teamMessages = messages.filter((m) => m.side === userSide);

  return (
    <div className="space-y-2">
      <div className="max-h-32 overflow-y-auto space-y-1">
        {teamMessages.slice(-5).map((message) => (
          <div key={message.id} className="text-xs">
            <span className="font-medium">{message.participantName}:</span>{' '}
            <span className="text-muted-foreground">{message.message}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Team chat..."
          className="h-8 text-xs"
        />
        <Button onClick={handleSend} size="sm" className="h-8 w-8 p-0">
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
