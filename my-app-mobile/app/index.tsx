import React, { useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, TextInput, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Plus, Search, Users, Zap, Trophy, ArrowRight, Clock, Star, BookOpen, Menu, Share2, Calendar } from "lucide-react-native";
import { StudyRoomCard, StudyRoomCardProps } from "../components/ui/study-room-card";
import { DebateRoomCard, DebateStatus, DebateRoom } from "../components/ui/debate-room-card";
import { ShareSheet } from "../components/ui/share-sheet";
// import { Navigation } from "../components/layout/navigation";
import { Footer } from "../components/layout/footer";
import { useSidebar } from "../lib/SidebarContext";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from '@react-native-masked-view/masked-view';

// --- CONSTANTS ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40; // Full width minus padding (20px each side)

// --- MOCK DATA ---

const MOCK_STUDY_ROOMS: StudyRoomCardProps[] = [
  {
    id: "1",
    title: "Webyalaya Brainstorm",
    sessionStatus: "UPCOMING",
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    duration: 45,
    maxParticipants: 50,
    joiningFee: 0,
    participantCount: 0,
    createdBy: { id: "u1", name: "Sachin anand", avatar: "https://i.pravatar.cc/150?u=u1" },
    skills: ["BRAINSTORMING"],
  },
  {
    id: "2",
    title: "Advanced React Patterns",
    sessionStatus: "UPCOMING",
    date: new Date(Date.now() + 172800000).toISOString(),
    duration: 60,
    maxParticipants: 10,
    joiningFee: 0,
    participantCount: 5,
    createdBy: { id: "u2", name: "Sarah Chen", avatar: "https://i.pravatar.cc/150?u=u2" },
    skills: ["React", "Frontend"],
  },
];

const MOCK_DEBATE_ROOMS: DebateRoom[] = [
  {
    id: "d1",
    topic: "AI will replace human creativity in the next decade",
    status: DebateStatus.OPEN,
    turnDurationSeconds: 120,
    maxParticipants: 4,
    teams: [
       { id: "t1", side: "FOR", participants: [] },
       { id: "t2", side: "AGAINST", participants: [] }
    ],
    host: { name: "System", avatar: "https://i.pravatar.cc/150?u=system" }
  },
  {
    id: "d2",
    topic: "Remote work is more productive than office work",
    status: DebateStatus.LIVE,
    turnDurationSeconds: 60,
    maxParticipants: 2,
    teams: [
       { id: "t3", side: "FOR", participants: [{ id: "u1", name: "User 1", status: "ACTIVE" }] },
       { id: "t4", side: "AGAINST", participants: [{ id: "u2", name: "User 2", status: "ACTIVE" }] }
    ],
    host: { name: "System", avatar: "https://i.pravatar.cc/150?u=system" },
    prizePool: 500
  },
];

const MOCK_TESTIMONIALS = [
  {
    id: 1,
    name: "Aakash Mishra",
    role: "Learner",
    rating: 5,
    text: "Explained in very simple language",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "Computer Science Student",
    rating: 5,
    text: "Webyalaya has completely transformed how I study. The peer-to-peer learning sessions are incredibly engaging!",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
  },
];

const TAGS = [
  "Join study rooms",
  "Host live sessions",
  "Participate in Debates",
  "Learn with each other"
];

const STATS = [
  { id: 1, label: "LEARNERS", value: "84", suffix: "", icon: Users, color: "bg-emerald-100", iconColor: "text-emerald-600" },
  { id: 2, label: "STUDY ROOMS", value: "141", suffix: "", icon: BookOpen, color: "bg-emerald-100", iconColor: "text-emerald-600" },
  { id: 3, label: "HOURS SPENT", value: "117", suffix: "+", icon: Clock, color: "bg-emerald-100", iconColor: "text-emerald-600" },
  { id: 4, label: "REVIEWS", value: "16", suffix: "", icon: Star, color: "bg-emerald-100", iconColor: "text-emerald-600", rating: 4.5 },
];

// --- COMPONENTS ---

// Updated Stat Card to match screenshot (Horizontal layout with icon on right)
function StatCard({ icon: Icon, value, label, suffix = "", color, iconColor, rating }: { icon: any, value: string, label: string, suffix?: string, color: string, iconColor: string, rating?: number }) {
  return (
    <View className="bg-white  w-full mb-4 p-5 rounded-3xl shadow-sm border border-slate-100  flex-row items-center justify-between">
      <View>
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</Text>
        <Text className="text-3xl font-extrabold text-slate-900 ">{value}<Text className="text-2xl">{suffix}</Text></Text>
        {rating && (
          <View className="flex-row items-center mt-1 bg-yellow-100/50 self-start px-2 py-0.5 rounded-full">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={12} 
                fill={i < Math.floor(rating) ? "#EAB308" : "transparent"} 
                color={i < Math.floor(rating) ? "#EAB308" : "#E5E7EB"} 
                className="mr-0.5"
              />
            ))}
            <Text className="text-xs font-bold text-yellow-700 ml-1">{rating}</Text>
          </View>
        )}
      </View>
      <View className={`h-14 w-14 rounded-full ${color} items-center justify-center`}>
        <Icon size={28} className={iconColor} />
      </View>
    </View>
  );
}

// Updated Testimonial Card to match screenshot (Floating image, blue badge)
function TestimonialCard({ item }: { item: typeof MOCK_TESTIMONIALS[0] }) {
  return (
    <View style={{ width: CARD_WIDTH, marginHorizontal: 10, marginTop: 48, marginBottom: 16 }}>
        {/* Main white card */}
        <View className="bg-white px-8 pt-24 pb-12 rounded-[40px] shadow-sm shadow-slate-200 min-h-[260px]">
            <Text className="text-xl text-slate-800 font-bold leading-relaxed tracking-tight">“{item.text}”</Text>
        </View>

        {/* Floating User Image (Top Right - overlapping border) */}
        <View className="absolute -top-8 right-8 h-28 w-28 rounded-full border-[8px] border-white overflow-hidden z-20 shadow-sm">
            <Image 
                source={{ uri: item.avatar }} 
                className="h-full w-full bg-slate-200"
            />
        </View>

        {/* Name Badge (Top Left - overlapping edge) */}
        {/* The banner container */}
        <View className="absolute top-8 -left-2 z-30 shadow-md max-w-[65%]">
            {/* Darker fold part */}
            <View className="absolute top-full left-0 w-2 h-2 bg-[#1e3a8a]" style={{ borderBottomLeftRadius: 8 }} />
            
            {/* Main blue banner */}
            <View className="bg-[#3b6ea5] h-14 pl-6 pr-4 rounded-r-full flex-row items-center">
                 <Text className="text-white font-extrabold text-lg mr-2 tracking-wide shrink" numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                 <View className="h-4 w-[1px] bg-white/20 mr-2" />
                 <View className="flex-row gap-0.5">
                     {[...Array(5)].map((_, i) => (
                        <Star 
                            key={i} 
                            size={12} 
                            fill={i < item.rating ? "#FBBF24" : "#cbd5e1"} 
                            color={i < item.rating ? "#FBBF24" : "#cbd5e1"} 
                        />
                     ))}
                 </View>
            </View>
        </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const testimonialScrollRef = useRef<ScrollView>(null);

  const scrollTestimonials = (direction: 'left' | 'right') => {
    if (testimonialScrollRef.current) {
        // Calculate current scroll position roughly or scroll by fixed amount
        // Here scrolling by one card width
        // For a more precise "snap to next item", we might need to track current index, 
        // but simple offset scrolling usually works well enough with snapping.
        // However, standard scrollTo with x offset is reliable.
        // Let's scroll by one snap interval.
        const scrollAmount = CARD_WIDTH + 20; 
        // Since we can't easily get current x without onScroll listener in a simple way, 
        // let's try a relative scroll approach if we were strictly using class components or reanimated, 
        // but here we can just invoke scroll relative to current view if we knew it.
        // Actually simpler: we can just scroll by an offset. But ScrollView doesn't have "scrollBy".
        // Nevermind, we'll use a state to track index or just let the user scroll.
        // Waiting for state might be overkill. 
        // Let's just implement a simple ref-based scroll if we can get current offset.
        // But we don't have current content offset easily without state.
        // Let's add a state for current index, that is robust.
    }
  };

  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Share Sheet State
  const [shareSheetVisible, setShareSheetVisible] = React.useState(false);
  const [selectedDebateRoom, setSelectedDebateRoom] = React.useState<DebateRoom | null>(null);

  const handleShare = (room: DebateRoom) => {
    setSelectedDebateRoom(room);
    setShareSheetVisible(true);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (testimonialScrollRef.current) {
        let newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= MOCK_TESTIMONIALS.length) newIndex = MOCK_TESTIMONIALS.length - 1;
        
        setCurrentIndex(newIndex);
        testimonialScrollRef.current.scrollTo({
            x: newIndex * (CARD_WIDTH + 20),
            animated: true,
        });
    }
  };

  return (
    <LinearGradient colors={['#ecfdf5', '#f0fdf4', '#f8fafc', '#ffffff']} locations={[0, 0.2, 0.5, 1]} style={{flex: 1}}>
      <View className="flex-1 bg-transparent">
        
        {/* Top Header */}
        <View className="absolute top-0 left-0 right-0 z-10 flex-row justify-between items-center px-4 pt-12 pb-3 bg-white/80 backdrop-blur-md border-b border-black/5">
             <TouchableOpacity onPress={openSidebar} className="p-2 rounded-full bg-slate-100/50">
                 <Menu size={24} color="#0f172a" />
             </TouchableOpacity>
             
             {/* Logo in Center */}
             <View className="absolute left-0 right-0 top-[52px] items-center justify-center pointer-events-none">
                <Image 
                    source={require('../assets/logo-webyalaya.png')} 
                    style={{ width: 120, height: 32, resizeMode: 'contain' }}
                />
             </View>

             {/* Placeholder for symmetry or profile/action */}
             <View className="w-10" /> 
        </View>

        {/* <Navigation /> */}

        <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 80, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          
          {/* --- HERO SECTION --- */}
          <View className="items-center pt-4 pb-8 px-5 bg-transparent mb-6">
            
            {/* Badge */}
            <View className="flex-row items-center bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full mb-6">
              <View className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
              <Text className="text-emerald-700  font-medium text-xs">Join 2,000+ students learning today</Text>
            </View>

            {/* Title */}
            <View className="items-center mb-6 w-full">
              <Text className="text-4xl sm:text-5xl font-extrabold text-center text-slate-900  mb-1 leading-tight tracking-tight">
                Peer-to-Peer Learning
              </Text>
              
              {/* Gradient Community Text */}
              <View style={{ height: 60, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  {Platform.OS === 'web' ? (
                     <Text 
                        className="text-4xl sm:text-5xl font-extrabold text-center leading-tight tracking-tight"
                        style={{
                            backgroundImage: 'linear-gradient(to right, #34d399, #3b82f6)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                            WebkitTextFillColor: 'transparent', 
                        }}
                     >
                        Community
                     </Text>
                  ) : (
                    <MaskedView
                        style={{ flex: 1, flexDirection: 'row', height: '100%' }}
                        maskElement={
                            <View style={{ backgroundColor: 'transparent', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text className="text-4xl sm:text-5xl font-extrabold text-center leading-tight tracking-tight" style={{ color: 'black' }}>
                                    Community
                                </Text>
                            </View>
                        }
                    >
                        <LinearGradient
                            colors={['#34d399', '#3b82f6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                        />
                    </MaskedView>
                  )}
              </View>
            </View>

          {/* Description */}
          <View className="max-w-lg mb-8 items-center">
            <Text className="text-base text-center text-slate-500 px-2 leading-relaxed mb-6">
              Welcome to a community-led learning platform where you don't just watch content, you 
              <Text className="text-slate-900  font-bold"> talk, practice, debate,</Text> and 
              <Text className="text-slate-900  font-bold"> grow</Text> through real conversations.
            </Text>

            <Text className="text-sm italic text-center text-slate-400">
              Because real learning and growth happens, when we do it together.
            </Text>
          </View>

          {/* Subtitle */}
          <Text className="font-bold text-slate-900  text-lg mb-4 text-center">
              Teach what you know. Learn what you want.
          </Text>

          {/* Tags */}
          <View className="mb-8 flex-row flex-wrap justify-center gap-2 max-w-sm">
            {TAGS.map((tag, index) => (
                <View key={index} className="bg-slate-100  px-3 py-1.5 rounded-md">
                    <Text className="text-xs font-semibold text-slate-600 ">{tag}</Text>
                </View>
            ))}
          </View>

          {/* Search Bar */}
          <View className="w-full max-w-md mb-8">
             <View className="bg-emerald-50/50 border border-emerald-200 rounded-xl px-4 h-12 flex-row items-center">
                <Search size={20} className="text-emerald-500 mr-3" />
                <TextInput 
                    placeholder="Search skills, topics, or peers..."
                    className="flex-1 text-base text-slate-700"
                    placeholderTextColor="#94a3b8"
                />
             </View>
          </View>
          {/* CTA Card (Centered with Plus Button) */}
          <View className="w-full max-w-md bg-white  rounded-2xl p-6 border border-slate-200  shadow-sm items-center">
             <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => router.push("/create-study-room")}
                className="h-16 w-16 bg-emerald-500 rounded-2xl items-center justify-center shadow-lg shadow-emerald-200 mb-2"
             >
                <Plus size={32} color="white" />
             </TouchableOpacity>
             
             <View className="flex-row items-center justify-center gap-1 mb-2">
                 <Text className="text-lg font-bold text-slate-900 text-center">Create a Study Room</Text>
                 <ArrowRight size={20} color="#0f172a" />
             </View>
             
             <View className="flex-row items-center justify-center space-x-4">
                 <View className="flex-row items-center">
                     <Users size={14} className="text-blue-500 mr-1.5" />
                     <Text className="text-xs text-slate-500">Multi-peer</Text>
                 </View>
                 <View className="flex-row items-center">
                     <Zap size={14} className="text-yellow-500 mr-1.5" />
                     <Text className="text-xs text-slate-500">Live Interaction</Text>
                 </View>
                 <View className="flex-row items-center">
                     <Trophy size={14} className="text-emerald-500 mr-1.5" />
                     <Text className="text-xs text-slate-500">Reward Points</Text>
                 </View>
             </View>
          </View>

        </View>

        {/* --- TRENDING STUDY ROOMS --- */}
        <View className="py-8 px-5">
            <View className="flex-row justify-between items-end mb-6">
                <Text className="text-3xl font-extrabold text-slate-900  leading-tight w-2/3">
                    Trending Study Rooms
                </Text>
                <TouchableOpacity onPress={() => router.push("/browse")} >
                    <Text className="text-slate-900 font-bold text-sm">View All</Text>
                </TouchableOpacity>
            </View>
            <Text className="text-slate-500 text-sm mb-6 -mt-4">
                Join active community sessions and learn together.
            </Text>
            
            <View className="gap-y-4">
                {MOCK_STUDY_ROOMS.map(room => (
                    <StudyRoomCard key={room.id} {...room} />
                ))}
            </View>
        </View>

        {/* --- STATS SECTION --- */}
        <View className="py-8 px-5">
           <Text className="text-3xl font-extrabold text-center text-slate-900  mb-2">Growing Together</Text>
           <Text className="text-slate-500 text-center text-sm mb-8 px-4">
               Join our thriving community of learners helping each other succeed
           </Text>
           
           <View>
             {STATS.map(stat => (
               <StatCard 
                  key={stat.id}
                  {...stat}
               />
             ))}
           </View>
        </View>

        {/* --- TESTIMONIALS SECTION --- */}
        <View className="py-12 bg-transparent">
           <View className="px-5 mb-12">
             <Text className="text-4xl font-extrabold text-slate-900 text-center mb-2 tracking-tight">What Our Community Says</Text>
             <Text className="text-slate-500 text-lg text-center font-medium">Real stories from learners who love using Webyalaya</Text>
           </View>
           
           <View className="relative justify-center">
                <TouchableOpacity onPress={() => {
                    const newIndex = Math.max(0, currentIndex - 1);
                    setCurrentIndex(newIndex);
                    testimonialScrollRef.current?.scrollTo({ x: newIndex * (CARD_WIDTH + 20), animated: true });
                }} className="absolute left-2 z-50 w-10 h-10 rounded-full bg-white shadow-md border border-green-100 items-center justify-center" style={{ top: '50%', marginTop: -20 }}>
                    <Text className="text-green-500 text-2xl pb-1">‹</Text>
                </TouchableOpacity>

                <ScrollView 
                    ref={testimonialScrollRef}
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
                    snapToInterval={CARD_WIDTH + 20} // Width + margin (20 = 10 margin each side)
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                        const newIndex = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + 20));
                        setCurrentIndex(newIndex);
                    }}
                >
                {MOCK_TESTIMONIALS.map(item => (
                    <TestimonialCard key={item.id} item={item} />
                ))}
                </ScrollView>

                <TouchableOpacity onPress={() => {
                    const newIndex = Math.min(MOCK_TESTIMONIALS.length - 1, currentIndex + 1);
                    setCurrentIndex(newIndex);
                    testimonialScrollRef.current?.scrollTo({ x: newIndex * (CARD_WIDTH + 20), animated: true });
                }} className="absolute right-2 z-50 w-10 h-10 rounded-full bg-white shadow-md border border-green-100 items-center justify-center" style={{ top: '50%', marginTop: -20 }}>
                    <Text className="text-green-500 text-2xl pb-1">›</Text>
                </TouchableOpacity>
           </View>

            {/* Pagination Line (Optional - can be removed if only arrows desired, but keeping just the indicator might look nice. Removing as per request implying replacement) */}
             <View className="flex-row justify-center items-center mt-4">
                <View className="h-2 w-16 rounded-full bg-green-100 overflow-hidden">
                    <View className="h-full w-1/2 bg-green-500 rounded-full" />
                </View>
            </View>
        </View>

        {/* --- TRENDING DEBATE ROOMS (Kept for completeness but simplified) --- */}
        <View className="py-12 px-5">
           <View className="flex-row justify-between items-end mb-6">
               <View className="flex-1 mr-4">
                 <Text className="text-2xl font-bold text-slate-900 ">Trending Debate Rooms</Text>
                 <Text className="text-slate-500 text-sm mt-1">Engage in meaningful conversations.</Text>
               </View>
               <TouchableOpacity onPress={() => router.push("/debate-room")}>
                 <Text className="text-emerald-600 font-bold text-sm">View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
               {MOCK_DEBATE_ROOMS.map((room, index) => (
                 <View key={index} className="w-[300px]">
                   <DebateRoomCard room={room} />
                 </View>
               ))}
            </ScrollView>
        </View>

      <Footer />
      </ScrollView>

      {/* Share Sheet */}
      <ShareSheet
        visible={shareSheetVisible} 
        onClose={() => setShareSheetVisible(false)} 
        title={selectedDebateRoom?.topic || "Check out this Debate Room!"}
        url={`https://myapp.com/debate/${selectedDebateRoom?.id}`}
      />

      </View>
    </LinearGradient>
  );
}
