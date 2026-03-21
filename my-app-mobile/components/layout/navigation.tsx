import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Navigation() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSignIn = () => {
    router.push('/sign-in');
    setIsMobileMenuOpen(false);
  };

  const handleSignUp = () => {
    router.push('/sign-up');
    setIsMobileMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const links = [
    { href: "/browse", label: "Browse" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <View style={{ paddingTop: insets.top, zIndex: 100 }} className="w-full absolute top-0 left-0 right-0">
      <View className="px-4 mt-2">
        <View className={cn(
          "bg-white border border-gray-100 rounded-3xl shadow-sm mx-2",
          isMobileMenuOpen ? "rounded-3xl border-b-0" : ""
        )}
        style={{
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3.84,
            elevation: 5,
        }}>
           <View className="flex-row items-center justify-between px-6 py-3">
            {/* Logo */}
            <TouchableOpacity onPress={() => router.push('/')}>
                <Image 
                    source={require('../../assets/logo-webyalaya.png')} 
                    style={{ width: 110, height: 28, resizeMode: 'contain' }}
                />
            </TouchableOpacity>

            {/* Mobile Menu Toggle */}
            <View className="flex-row items-center gap-2">
                 <TouchableOpacity onPress={toggleMenu} className="p-1">
                     {isMobileMenuOpen ? (
                         <X size={24} color="#000" />
                     ) : (
                         <Menu size={24} color="#000" />
                     )}
                 </TouchableOpacity>
            </View>
        </View>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
            <View className="border-t border-gray-100 px-4 pb-5 pt-2 bg-white rounded-b-3xl absolute top-full left-0 right-0 shadow-lg w-full z-50">
                <View className="gap-2 mt-2">
                    {links.map((link) => (
                         <TouchableOpacity 
                            key={link.href}
                            onPress={() => { router.push(link.href as any); setIsMobileMenuOpen(false); }}
                            className="px-4 py-3 rounded-xl active:bg-gray-50"
                         >
                             <Text className="text-base font-medium text-gray-600">{link.label}</Text>
                         </TouchableOpacity>
                    ))}
                </View>
                
                 <View className="mt-6 flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                     <TouchableOpacity onPress={handleSignIn} className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                         <Text className="text-green-700 font-semibold text-sm">Sign In</Text>
                     </TouchableOpacity>
                     <TouchableOpacity onPress={handleSignUp} className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                         <Text className="text-green-700 font-semibold text-sm">Sign Up</Text>
                     </TouchableOpacity>
                 </View>
            </View>
        )}
        </View>
      </View>
    </View>
  );
}
