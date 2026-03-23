import React from 'react';
import { View, Text, TouchableOpacity, Linking, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Footer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();

  const handleLinkPress = (url: string) => {
      Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <View
      className="mt-6 border-t border-black/5 bg-background/60 px-4 pt-8"
      style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
    >
      <View className="flex-col gap-4">
        
        {/* Top Section: Logo & Slogan */}
        <View className="flex-row items-center gap-2 flex-wrap">
            <TouchableOpacity onPress={() => router.push('/')}>
                 <Image 
                    source={require('../../assets/logo-webyalaya.png')} 
                    style={{ width: 140, height: 35, resizeMode: 'contain' }}
                 />
            </TouchableOpacity>
            <Text className="text-xs text-muted-foreground mt-1">Made by Indians. Loved by Learners</Text>
        </View>

        {/* Links Navigation */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-2">
             <Link href="/about" className="text-xs text-muted-foreground font-medium">About</Link>
             <TouchableOpacity onPress={() => handleLinkPress("https://webyalaya.com/careers")}>
                <Text className="text-xs text-muted-foreground font-medium">Careers</Text>
             </TouchableOpacity>
             <Link href="/terms-of-use" className="text-xs text-muted-foreground font-medium">Terms of Use</Link>
             <Link href="/privacy-policy" className="text-xs text-muted-foreground font-medium">Privacy Policy</Link>
        </View>
        
        {/* Copyright */}
        <View className="mt-2">
            <Text className="text-xs text-muted-foreground">
                © {currentYear} Humitra Pvt Ltd. All rights reserved.
            </Text>
        </View>

        {/* Social Links */}
        <View className="flex-row gap-4 mt-2">
             <TouchableOpacity onPress={() => handleLinkPress("https://www.linkedin.com/company/webyalaya/?viewAsMember=true")}>
                 <Linkedin size={20} color="#64748b" />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => handleLinkPress("https://facebook.com/webyalaya")}>
                 <Facebook size={20} color="#64748b" />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => handleLinkPress("https://www.instagram.com/webyalaya")}>
                 <Instagram size={20} color="#64748b" />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => handleLinkPress("http://www.youtube.com/@webyalaya")}>
                 <Youtube size={20} color="#64748b" />
             </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}
