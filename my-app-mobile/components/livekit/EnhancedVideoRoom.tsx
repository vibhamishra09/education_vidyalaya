import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Dimensions, StatusBar as RNStatusBar, Modal, Alert, Image, Animated, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, 
  MessageSquare, Users, MoreVertical, X, Settings2, 
  Share2, ShieldCheck, AlertCircle, Clock, Zap, Maximize2, Minimize2,
  LayoutGrid, Presentation, Pin, PinOff, Timer, Power, LogOut, ChevronUp, User, Lock, Check, ChevronLeft, ChevronRight, Grid2X2
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { 
  LiveKitRoom, 
  useParticipants,
  useLocalParticipant,
  useTracks,
  useSpeakingParticipants,
  VideoTrack,
  AudioSession,
} from '@livekit/react-native';
import { 
  Track, 
  RoomOptions, 
  VideoPresets, 
  Participant,
  TrackPublication,
  LocalParticipant,
  RemoteParticipant,
  RoomEvent,
} from 'livekit-client';
import { useSessionTimer } from '../../hooks/use-session-timer';
import { MobileChatSheet } from './MobileChatSheet';
import { MobileParticipantSheet } from './MobileParticipantSheet';
import { ShareSheet } from '../ui/share-sheet';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as ExpoKeepAwake from 'expo-keep-awake';

// Helper for tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// WebRTC availability check
const isWebRTCAvailable = !!(Platform.OS === 'web' || (typeof global !== 'undefined' && (global as any).RTCPeerConnection));

// Mock types
interface ChatIdentity {
  id: string;
  name: string;
  avatar?: string | null;
}

interface SessionData {
	id: string;
	date: string;
	duration: number; // in minutes
	sessionType: 'studyRoom' | 'peerSession';
	title?: string;
    [key: string]: unknown;
}

interface ChatRecipient {
	id: string
	name: string
	avatar?: string | null;
    isOnline?: boolean;
}

interface EnhancedVideoRoomProps {
  token: string;
  serverUrl: string;
  channelId?: string | null; // For chat
  sessionData?: SessionData | null;
  isHost?: boolean;
  currentUserDbId?: string | null;
  chatRecipients?: ChatRecipient[];
  hostUser?: ChatIdentity | null;
  onEndSession?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ----------------------------------------------------------------------
// Participant Components (Matching Web Styling)
// ----------------------------------------------------------------------

const ParticipantTile = ({ 
    participant,
    onPin,
    isPinned,
    variant = 'grid' // 'grid' | 'focus-main' | 'focus-thumb'
}: { 
    participant: Participant;
    onPin?: () => void;
    isPinned?: boolean;
    variant?: 'grid' | 'focus-main' | 'focus-thumb';
}) => {
    const isSpeaking = participant.isSpeaking;
    const isLocal = participant instanceof LocalParticipant;
    const isMicOn = participant.isMicrophoneEnabled;
    const isCamOn = participant.isCameraEnabled;
    const name = participant.identity || participant.name || 'Unknown';
    const avatarUrl = null; // Can be extracted from metadata if available
    // Dynamic border color based on speaking/pinned
    const borderColor = isSpeaking ? 'border-[#00DC6E]' : isPinned ? 'border-blue-500' : 'border-transparent';
    const borderWidth = isSpeaking || isPinned ? 'border-2' : 'border-0';
    
    // Avatar Size based on variant
    const avatarSize = variant === 'focus-thumb' ? 'w-10 h-10' : variant === 'focus-main' ? 'w-24 h-24' : 'w-16 h-16';
    const textSize = variant === 'focus-thumb' ? 'text-xs' : variant === 'focus-main' ? 'text-2xl' : 'text-xl';

    return (
      <View 
        className={cn(
            "bg-[#1a1a1a] overflow-hidden justify-center items-center relative",
            variant === 'focus-thumb' ? "rounded-xl border border-white/10" : "rounded-2xl",
            variant !== 'focus-thumb' && borderColor,
            variant !== 'focus-thumb' && borderWidth,
            variant === 'focus-thumb' && isSpeaking && "border-[#00DC6E] border-2",
            "flex-1 w-full h-full"
        )}
      >
        {/* Background / Avatar or Real Video */}
        <View className="absolute inset-0 bg-[#252525] items-center justify-center">
            {isCamOn && participant.getTrackPublication(Track.Source.Camera) ? (
                <VideoTrack 
                    trackRef={{
                        participant,
                        source: Track.Source.Camera,
                        publication: participant.getTrackPublication(Track.Source.Camera)!
                    }} 
                    style={{ width: '100%', height: '100%' }}
                />
            ) : avatarUrl ? (
                 <Image source={{ uri: avatarUrl }} className={`${avatarSize} rounded-full`} />
            ) : (
                 <View className={`${avatarSize} rounded-full bg-[#3a3a3a] items-center justify-center shadow-lg`}>
                    <Text className={`text-white font-bold ${textSize}`}>{name.charAt(0).toUpperCase()}</Text>
                 </View>
            )}
        </View>
    
        {/* Status Icons Overlay (Top Right) */}
        {(!isMicOn || !isCamOn) && variant !== 'focus-thumb' && (
            <View className="absolute top-3 right-3 flex-row gap-1.5 z-10">
                 {!isMicOn && (
                    <View className="w-7 h-7 rounded-full bg-sky-500 items-center justify-center shadow-sm">
                        <MicOff size={14} color="white" />
                    </View>
                 )}
                 {!isCamOn && (
                    <View className="w-7 h-7 rounded-full bg-sky-500 items-center justify-center shadow-sm">
                        <VideoOff size={14} color="white" />
                    </View>
                 )}
            </View>
        )}
        
        {/* Helper for Focus Thumb - smaller status icons */}
        {(!isMicOn || !isCamOn) && variant === 'focus-thumb' && (
             <View className="absolute top-1 right-1 flex-row gap-0.5 z-10">
                 {!isMicOn && (
                    <View className="w-4 h-4 rounded-full bg-sky-500 items-center justify-center">
                        <MicOff size={8} color="white" />
                    </View>
                 )}
            </View>
        )}
        
        {/* Pin Button (Top Left) - Only shown if onPin provided */}
        {onPin && variant !== 'focus-thumb' && (
             <TouchableOpacity 
                onPress={onPin} 
                className="absolute top-3 left-3 bg-black/40 hover:bg-black/60 p-2 rounded-full border border-white/10 z-20"
             >
                {isPinned ? <PinOff size={16} color="white" /> : <Pin size={16} color="white" />}
             </TouchableOpacity>
        )}
        
        {/* Name Label (Bottom Left) */}
        {variant !== 'focus-thumb' && (
            <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-1.5 z-10">
                <View className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/5 flex-row items-center gap-1.5">
                    {/* Speaking Indicator inside label */}
                    {isSpeaking && (
                         <View className="w-1.5 h-1.5 rounded-full bg-[#00DC6E]" />
                    )}
                    <Text className="text-white text-xs font-medium tracking-wide">
                        {name} {isLocal && <Text className="text-white/50">(You)</Text>}
                    </Text> 
                </View>
            </View>
        )}
      </View>
    );    
};

// Layout Components
const GridLayout = ({ 
    participants, 
    pinnedId, 
    onPin 
}: { 
    participants: Participant[], 
    pinnedId: string | null, 
    onPin: (id: string) => void 
}) => {
    const count = participants.length;
    
    // Calculate dimensions
    const getStyles = (index: number): any => {
        if (count === 1) return { width: '100%', height: '100%' };
        if (count === 2) return { width: '100%', height: '48%', marginBottom: index === 0 ? '4%' : 0 };
        if (count <= 4) return { width: '48%', height: '48%', marginBottom: index < 2 ? '4%' : 0, marginRight: index % 2 === 0 ? '4%' : 0 };
        return { width: '32%', height: '32%', marginBottom: '2%', marginRight: (index + 1) % 3 !== 0 ? '2%' : 0 };
    };

    return (
        <View className="flex-1 w-full p-2 flex-row flex-wrap justify-center content-center">
            {participants.map((p, index) => (
                <View key={p.sid} style={getStyles(index)}>
                    <ParticipantTile 
                        participant={p}
                        isPinned={pinnedId === p.sid}
                        onPin={() => onPin(p.sid)}
                        variant="grid"
                    />
                </View>
            ))}
        </View>
    );
};

// Focus Layout
const FocusLayout = ({ 
    participants, 
    pinnedId, 
    onPin 
}: { 
    participants: Participant[], 
    pinnedId: string | null, 
    onPin: (id: string) => void 
}) => {
    // Determine focused participant (pinned > speaking > last active)
    const focusedParticipant = participants.find(p => p.sid === pinnedId) 
        || participants.find(p => p.isSpeaking && !(p instanceof LocalParticipant)) 
        || participants.find(p => !(p instanceof LocalParticipant)) 
        || participants[0];

    const thumbnails = participants.filter(p => p.sid !== focusedParticipant?.sid);

    return (
        <View className="flex-1 w-full bg-[#0a0a0a]">
            {/* Top Thumbnail Strip */}
            {thumbnails.length > 0 && (
                <View className="h-32 bg-[#0d0d0d] border-b border-white/5 py-2">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
                        {thumbnails.map((p) => (
                             <TouchableOpacity 
                                key={p.sid} 
                                style={{ width: 120, height: '100%' }}
                                onPress={() => onPin(p.sid)} // Click to pin/focus
                             >
                                <ParticipantTile 
                                    participant={p}
                                    variant="focus-thumb"
                                />
                             </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Main Stage */}
            <View className="flex-1 p-0 justify-center items-center">
                {focusedParticipant ? (
                    <ParticipantTile 
                        participant={focusedParticipant}
                        isPinned={pinnedId === focusedParticipant.sid}
                        onPin={() => onPin(focusedParticipant.sid)}
                        variant="focus-main"
                    />
                ) : (
                    <View className="items-center justify-center">
                        <Text className="text-white/50">Waiting for participants...</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

export function EnhancedVideoRoom(props: EnhancedVideoRoomProps) {
  if (!isWebRTCAvailable) {
    return <WebRTCUnavailableScreen />;
  }
  
  return (
    <LiveKitRoom
      token={props.token}
      serverUrl={props.serverUrl}
      connect={true}
      audio={true}
      video={true}
    >
      <VideoRoomInner {...props} />
    </LiveKitRoom>
  );
}

function VideoRoomInner({
  token,
  serverUrl,
  channelId,
  sessionData,
  isHost = false,
  currentUserDbId,
  chatRecipients = [],
  hostUser,
  onEndSession
}: EnhancedVideoRoomProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Real LiveKit Data
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  
  // Local State
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'focus'>('grid');
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [showEndMenu, setShowEndMenu] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);

  // Keep screen awake and initialize audio session
  useEffect(() => {
    ExpoKeepAwake.activateKeepAwakeAsync();
    AudioSession.startAudioSession();
    return () => { 
        ExpoKeepAwake.deactivateKeepAwake(); 
        AudioSession.stopAudioSession();
    };
  }, []);

  // User Activity for auto-hiding controls
  const [isUserActive, setIsUserActive] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    setIsUserActive(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsUserActive(false);
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 4000); // 4 seconds timeout
  }, [controlsOpacity]);

  // Handle Initial Timer
  useEffect(() => {
     resetActivity(); 
     return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }
  }, [resetActivity]);

  // Flash & Extension States
  const [extensionRequest, setExtensionRequest] = useState<{ requester: string } | null>(null);
  const [activeFlashMessage, setActiveFlashMessage] = useState<any>(null); // Simplified typing
  const [showQuestionManager, setShowQuestionManager] = useState(false);

  // Controls sync with real local participant
  const isMicOn = localParticipant?.isMicrophoneEnabled ?? false;
  const isCamOn = localParticipant?.isCameraEnabled ?? false;

  const toggleMic = async () => {
    if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(!isMicOn);
    }
  };

  const toggleCam = async () => {
    if (localParticipant) {
        await localParticipant.setCameraEnabled(!isCamOn);
    }
  };

  // Session Timer
  const sessionStartTime = useMemo(() => sessionData?.date ? new Date(sessionData.date).getTime() : Date.now(), [sessionData]);
  const [showEndWarning, setShowEndWarning] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  const { formatTime } = useSessionTimer({
      startTime: sessionStartTime,
      duration: sessionData?.duration || 60,
      onTimeUp: () => Alert.alert("Session Ended", "Time is up.", [{ text: "OK", onPress: () => router.back() }]),
      onWarning: (minutes) => {
          setRemainingMinutes(minutes);
          setShowEndWarning(true);
      },
      enabled: true
  });

  return (
    <TouchableWithoutFeedback onPress={resetActivity}>
    <View className="flex-1 bg-[#09090b]">
      <RNStatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      {/* ---------------------------------------------------------------------- */}
      {/* OVERLAYS */}
      {/* ---------------------------------------------------------------------- */}
      
      {/* (Overlays removed temporarily for debugging) */}

      {/* ---------------------------------------------------------------------- */}
      {/* TOP BAR - PILL STYLE */}
      {/* ---------------------------------------------------------------------- */}
      <Animated.View 
        style={{ 
          opacity: controlsOpacity,
          top: Math.max(insets.top, 16) 
        }} 
        pointerEvents={isUserActive ? 'auto' : 'none'} 
        className="absolute left-0 right-0 z-50 items-center px-4"
      >
            <View className="bg-[#1a1a1a]/95 backdrop-blur-md px-4 py-2 rounded-full flex-row items-center gap-4 border border-white/10 shadow-2xl">
                {/* Meeting Info */}
                <View className="flex-row items-center gap-2.5">
                    <ShieldCheck size={16} color="#00DC6E" />
                    <View className="flex-row items-center gap-2.5">
                        <Text className="text-white text-xs font-bold tracking-wide max-w-[120px]" numberOfLines={1}>
                            {sessionData?.title || 'Webyalaya Meeting'}
                        </Text>
                        <View className="w-[1px] h-3.5 bg-white/20" />
                        <Text className="text-white/50 text-[10px] font-mono font-medium tracking-tight">
                            {formatTime()}
                        </Text>
                    </View>
                </View>

                {/* View Switcher */}
                <View className="relative">
                    <TouchableOpacity 
                        onPress={() => setIsViewMenuOpen(!isViewMenuOpen)}
                        className="w-7 h-7 items-center justify-center rounded-full bg-white/5 active:bg-white/10 hover:bg-white/10 border border-white/5"
                    >
                        <LayoutGrid size={14} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>

                    {/* Dropdown */}
                    {isViewMenuOpen && (
                        <View className="absolute top-10 right-0 w-36 bg-[#252525] border border-white/10 rounded-xl shadow-2xl z-[101] py-1.5">
                            <Text className="px-3 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Layout</Text>
                            <TouchableOpacity 
                                onPress={() => { setLayoutMode('focus'); setIsViewMenuOpen(false); }}
                                className="flex-row items-center justify-between px-3 py-2.5 active:bg-white/5 w-full"
                            >
                                <View className="flex-row items-center gap-2.5">
                                    <Presentation size={14} color={layoutMode === 'focus' ? 'white' : 'rgba(255,255,255,0.5)'} />
                                    <Text className="text-white text-xs font-medium">Speaker</Text>
                                </View>
                                {layoutMode === 'focus' && <Check size={12} color="#00DC6E" />}
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => { setLayoutMode('grid'); setIsViewMenuOpen(false); }}
                                className="flex-row items-center justify-between px-3 py-2.5 active:bg-white/5 w-full"
                            >
                                <View className="flex-row items-center gap-2.5">
                                    <Grid2X2 size={14} color={layoutMode === 'grid' ? 'white' : 'rgba(255,255,255,0.5)'} />
                                    <Text className="text-white text-xs font-medium">Gallery</Text>
                                </View>
                                {layoutMode === 'grid' && <Check size={12} color="#00DC6E" />}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
      </Animated.View>

      {/* ---------------------------------------------------------------------- */}
      {/* VIDEO AREA - DYNAMIC LAYOUT */}
      {/* ---------------------------------------------------------------------- */}
      <View 
        style={{ 
          paddingTop: insets.top + (isUserActive ? 64 : 0), 
          paddingBottom: insets.bottom + (isUserActive ? 80 : 0) 
        }}
        className="flex-1 bg-[#09090b]"
      >
            {layoutMode === 'grid' ? (
                <GridLayout 
                    participants={participants} 
                    pinnedId={pinnedParticipantId}
                    onPin={setPinnedParticipantId}
                />
            ) : (
                <FocusLayout 
                    participants={participants}
                    pinnedId={pinnedParticipantId}
                    onPin={setPinnedParticipantId}
                />
            )}
      </View>

      {/* ---------------------------------------------------------------------- */}
      {/* BOTTOM CONTROL BAR - FLOATING ISLAND */}
      {/* ---------------------------------------------------------------------- */}
      <Animated.View 
         style={{ 
           opacity: controlsOpacity,
           bottom: Math.max(insets.bottom, 16) 
         }} 
         pointerEvents={isUserActive ? 'auto' : 'none'}
         className="absolute left-4 right-4 z-50 items-center"
      >
        <View className="flex-row items-center justify-between bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-2.5 shadow-2xl w-full max-w-[500px]">
            
            {/* Left Controls - Audio/Video */}
            <View className="flex-row items-center gap-2">
                <TouchableOpacity 
                    onPress={toggleMic}
                    className={`w-10 h-10 rounded-full items-center justify-center border shadow-sm ${
                        isMicOn ? 'bg-white/5 border-white/5 active:bg-white/10' : 'bg-red-500 border-red-400'
                    }`}
                >
                    {isMicOn ? <Mic size={18} color="white" /> : <MicOff size={18} color="white" />}
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={toggleCam}
                    className={`w-10 h-10 rounded-full items-center justify-center border shadow-sm ${
                        isCamOn ? 'bg-white/5 border-white/5 active:bg-white/10' : 'bg-red-500 border-red-400'
                    }`}
                >
                    {isCamOn ? <VideoIcon size={18} color="white" /> : <VideoOff size={18} color="white" />}
                </TouchableOpacity>

                <View className="w-[1px] h-6 bg-white/10 mx-1" />
            </View>

            {/* Center Controls - Interactions */}
            <View className="flex-row items-center gap-2">
                 <TouchableOpacity 
                    onPress={() => setShowChat(!showChat)}
                    className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/5 active:bg-white/10"
                >
                    <MessageSquare size={18} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setShowParticipants(!showParticipants)}
                    className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/5 active:bg-white/10 relative"
                >
                    <Users size={18} color="white" />
                    <View className="absolute -top-1 -right-1 bg-sky-500 rounded-full px-1 py-0.5 border border-[#141414]">
                        <Text className="text-[9px] font-bold text-white">{participants.length}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setShareSheetVisible(true)}
                    className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/5 active:bg-white/10"
                >
                    <Share2 size={18} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setShareSheetVisible(true)}
                    className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/5 active:bg-white/10"
                >
                    <Share2 size={18} color="white" />
                </TouchableOpacity>
{/* 
                <TouchableOpacity 
                    onPress={() => setShowQuestionManager(true)}
                    className="w-10 h-10 rounded-full bg-amber-500/10 items-center justify-center border border-amber-500/20 active:bg-amber-500/20"
                >
                    <Zap size={18} color="#f59e0b" />
                </TouchableOpacity> */}
            </View>

            {/* Right Controls - End Call */}
            <View className="flex-row items-center gap-2 pl-2 border-l border-white/10 ml-2">
                <TouchableOpacity 
                    onPress={() => setShowEndMenu(true)}
                    className="w-16 h-10 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex-row items-center justify-center gap-1.5"
                >
                    <Text className="text-red-500 text-xs font-bold uppercase tracking-wider">End</Text>
                   {/* <LogOut size={14} color="#ef4444" /> */}
                </TouchableOpacity>
            </View>

        </View>
      </Animated.View>

      {/* End Call Confirmation */}
      <Modal
        visible={showEndMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEndMenu(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="bg-[#1a1a1a] p-6 rounded-2xl w-full max-w-sm border border-white/10">
                <Text className="text-white text-lg font-bold mb-2">Leave Session?</Text>
                <Text className="text-white/60 mb-6">Are you sure you want to end this study session?</Text>
                
                <View className="flex-row gap-3">
                    <TouchableOpacity 
                        onPress={() => setShowEndMenu(false)}
                        className="flex-1 bg-white/5 py-3 rounded-xl items-center"
                    >
                        <Text className="text-white font-medium">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => {
                            setShowEndMenu(false);
                            if (onEndSession) onEndSession();
                            else router.back();
                        }}
                        className="flex-1 bg-red-500 py-3 rounded-xl items-center"
                    >
                        <Text className="text-white font-bold">Leave Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* (Modals for Chat/Participants removed temporarily) */}
      <MobileChatSheet 
        visible={showChat} 
        onClose={() => setShowChat(false)}
        channelId={channelId}
        currentUserId={currentUserDbId}
      />

      <ShareSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        title={sessionData?.title || "Join my Session"}
        message={`Join my session: ${sessionData?.title}`}
        url={`https://myapp.com/session/${sessionData?.id}`}
      />

      <MobileParticipantSheet
        visible={showParticipants}
        onClose={() => setShowParticipants(false)}
        participants={participants.map(p => ({
            id: p.sid,
            name: p.identity || p.name || 'Unknown',
            isLocal: p instanceof LocalParticipant,
            isSpeaking: p.isSpeaking,
            isMicOn: p.isMicrophoneEnabled,
            isCamOn: p.isCameraEnabled
        }))}
        isLocalHost={isHost}
      />
      
    </View>
    </TouchableWithoutFeedback>
  );
}

function WebRTCUnavailableScreen() {
    const insets = useSafeAreaInsets();
    
    return (
        <View className="flex-1 bg-[#09090b] items-center justify-center px-8" style={{ paddingTop: insets.top }}>
            <View className="w-20 h-20 bg-amber-500/10 rounded-full items-center justify-center mb-6">
                <AlertCircle size={40} color="#f59e0b" />
            </View>
            
            <Text className="text-white text-2xl font-bold text-center mb-4">
                Development Client Required
            </Text>
            
            <View className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 w-full mb-8">
                <Text className="text-white/80 text-sm leading-6 mb-4">
                    This feature uses <Text className="text-[#00DC6E] font-bold">WebRTC</Text> for real-time video, which is not available in the standard Expo Go app. 
                </Text>
                
                <Text className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">How to Fix:</Text>
                <View className="gap-2">
                    <Text className="text-white/80 text-sm">• Build a <Text className="font-bold">Development Client</Text></Text>
                    <Text className="text-white/80 text-sm">• Run <Text className="font-mono text-amber-500">npx expo run:android</Text> or <Text className="font-mono text-amber-500">run:ios</Text></Text>
                    <Text className="text-white/80 text-sm">• Or use <Text className="font-bold">EAS Build</Text> for a standalone app</Text>
                </View>
            </View>
            
            <TouchableOpacity 
                onPress={() => Alert.alert("Build Instructions", "Run 'npx expo run:android' or 'npx expo run:ios' in your terminal to build the app with native video support.")}
                className="bg-[#00DC6E] px-8 py-4 rounded-full active:opacity-80"
            >
                <Text className="text-[#002c16] font-bold text-base">View Setup Guide</Text>
            </TouchableOpacity>
        </View>
    );
}
