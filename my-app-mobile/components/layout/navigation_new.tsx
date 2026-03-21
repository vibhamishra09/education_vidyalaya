import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Menu, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Navigation() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSignIn = () => {
    router.push('/sign-in');
  };

  const handleSignUp = () => {
    router.push('/sign-up');
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <View 
        className="absolute top-0 left-0 right-0 z-50 w-full pointer-events-none"
        style={{ paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top + 10 }}
    >
        {/* Floating Pill Container */}
        <View className="mx-4">
            <View className="bg-background/95 rounded-2xl border border-border/50 shadow-lg px-4 py-3 flex-row items-center justify-between pointer-events-auto">
                {/* Logo */}
                <TouchableOpacity onPress={() => router.push('/')} className="flex-row items-center gap-2">
                    <Image 
                        source={require('../../assets/logo.png')}
                        style={{ width: 120, height: 32, resizeMode: 'contain' }}
                    />
                     {/* Fallback to text if image fails or for dev */}
                    <View className="absolute inset-0 items-center justify-center opacity-0">
                         <Text className="font-bold text-xl text-primary">Webyalaya</Text>
                    </View>
                </TouchableOpacity>

                {/* Right Side: Menu Toggle (Mobile) or Links (Desktop - Hidden) */}
                <View className="flex-row items-center gap-2">
                     <View className="hidden md:flex flex-row gap-4 mr-4">
                         <Link href="/browse" className="text-sm font-medium text-muted-foreground">Browse</Link>
                         <Link href="/how-it-works" className="text-sm font-medium text-muted-foreground">How it works</Link>
                     </View>

                     <TouchableOpacity onPress={toggleMenu} className="p-1">
                         {isMobileMenuOpen ? (
                             <X size={24} className="text-foreground" color="#000" />
                         ) : (
                             <Menu size={24} className="text-foreground" color="#000" />
                         )}
                     </TouchableOpacity>
                </View>
            </View>

            {/* Mobile Menu Dropdown - Floating below the header */}
            {isMobileMenuOpen && (
                <View className="mt-2 bg-background/95 border border-border/50 rounded-2xl p-6 shadow-xl pointer-events-auto">
                    <View className="space-y-6 mb-8">
                         <TouchableOpacity onPress={() => router.push('/browse')}>
                            <Text className="text-lg text-foreground font-medium">Browse</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/how-it-works')}>
                            <Text className="text-lg text-foreground font-medium">How it works</Text>
                        </TouchableOpacity>
                    </View>
                    
                     <View className="flex-row justify-end gap-3 mt-4 border-t border-border/10 pt-4">
                         <TouchableOpacity onPress={handleSignIn} className="px-6 py-2.5 rounded-xl border border-green-200 bg-green-50">
                             <Text className="text-green-700 font-bold">Sign In</Text>
                         </TouchableOpacity>
                         <TouchableOpacity onPress={handleSignUp} className="px-6 py-2.5 rounded-xl border border-green-200 bg-white">
                             <Text className="text-green-700 font-bold">Sign Up</Text>
                         </TouchableOpacity>
                     </View>
                </View>
            )}
        </View>
    </View>
  );
}
