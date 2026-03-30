import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Image, Dimensions, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, HelpCircle, LayoutDashboard, Coins, User, LogOut, Bell } from 'lucide-react-native';
import { useSidebar } from '../lib/SidebarContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

function SidebarLink({ icon: Icon, label, isActive, onPress }: any) {
    return (
        <Pressable 
            onPress={onPress}
            style={[
                styles.sidebarLink,
                isActive && styles.sidebarLinkActive
            ]}
        >
            <Icon size={20} color={isActive ? "#047857" : "#64748b"} />
            <Text style={[styles.sidebarLinkText, isActive && styles.sidebarLinkTextActive]}>
                {label}
            </Text>
        </Pressable>
    );
}

export function Sidebar() {
    const { isOpen, closeSidebar, pathname, navigateTo } = useSidebar();
    const insets = useSafeAreaInsets();
    const { isSignedIn } = useAuth();
    const { signOut } = useClerk();
    const { user } = useUser();
    const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [isVisible, setIsVisible] = React.useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            const openAnimation = Animated.parallel([
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]);

            openAnimation.start();
            return () => openAnimation.stop();
        } else {
            const closeAnimation = Animated.parallel([
                Animated.timing(translateX, {
                    toValue: -SIDEBAR_WIDTH,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]);

            closeAnimation.start(({ finished }) => {
                if (finished) {
                    setIsVisible(false);
                }
            });

            return () => closeAnimation.stop();
        }
    }, [isOpen, opacity, translateX]);

    if (!isVisible) return null;
    
    const navigate = (path: string) => {
        if (pathname === path) {
            closeSidebar();
            return;
        }
        closeSidebar();
        setTimeout(() => {
            navigateTo(path);
        }, 50);
    };

    const navigateProtected = (path: string) => {
        if (isSignedIn) {
            navigate(path);
            return;
        }

        closeSidebar();
        setTimeout(() => {
            navigateTo({
                pathname: '/sign-in',
                params: { redirectTo: path },
            } as any);
        }, 50);
    };

    const handleLogout = async () => {
        await signOut();
        closeSidebar();
        setTimeout(() => {
            navigateTo('/' as any);
        }, 50);
    };

    return (
        <View style={styles.container} pointerEvents={isOpen ? 'auto' : 'none'}>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity }]}>
                <TouchableOpacity style={styles.backdropTouchable} onPress={closeSidebar} activeOpacity={1} />
            </Animated.View>
            
            {/* Sidebar Content */}
            <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX }] }]}>
                <LinearGradient
                    colors={['#f6fffa', '#ecfdf5', '#ffffff']}
                    locations={[0, 0.4, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradient, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.logoContainer} onPress={() => navigate('/')}>
                            <Image 
                                source={require('../assets/logo-webyalaya.png')} 
                                style={styles.logo}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={closeSidebar} style={styles.closeButton}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Navigation Links */}
                    <View style={styles.navLinks}>
                        <SidebarLink 
                            icon={Search} 
                            label="Browse" 
                            isActive={pathname === '/browse'}
                            onPress={() => navigate('/browse')} 
                        />
                        <SidebarLink 
                            icon={HelpCircle} 
                            label="How it works" 
                            isActive={pathname === '/how-it-works'}
                            onPress={() => navigate('/how-it-works')} 
                        />
                        <SidebarLink 
                            icon={LayoutDashboard} 
                            label="Dashboard" 
                            isActive={pathname === '/dashboard'}
                            onPress={() => navigateProtected('/dashboard')} 
                        />
                    </View>

                    <View style={styles.spacer} />

                    {/* Footer */}
                    <View style={styles.footer}>
                        {/* User Info */}
                        <View style={styles.userInfo}>
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={{ uri: user?.imageUrl || "https://github.com/shadcn.png" }}
                                    style={styles.avatar}
                                />
                            </View>
                            <View style={styles.userTextContainer}>
                                <Text style={styles.userName}>
                                    {user?.fullName || user?.firstName || 'Guest User'}
                                </Text>
                                <Text style={styles.userHandle}>
                                    {user?.primaryEmailAddress?.emailAddress || 'Sign in to sync your profile'}
                                </Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                onPress={() => navigateProtected('/profile')}
                                style={styles.profileButton}
                            >
                                <User size={16} color="#059669" />
                                <Text style={styles.profileButtonText}>
                                    {isSignedIn ? 'Profile' : 'Sign In'}
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={() =>
                                    isSignedIn
                                        ? void handleLogout()
                                        : navigate('/sign-up')
                                }
                                style={styles.logoutButton}
                            >
                                <LogOut size={16} color="#ef4444" />
                                <Text style={styles.logoutButtonText}>
                                    {isSignedIn ? 'Logout' : 'Sign Up'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Coins and Notifications */}
                        <View style={styles.bottomSection}>
                            <TouchableOpacity
                                style={styles.coinsCard}
                                onPress={() => navigateProtected('/profile')}
                            >
                                <View style={styles.coinsLeft}>
                                    <View style={styles.coinsIconContainer}>
                                        <Coins size={18} color="#d97706" />
                                    </View>
                                    <Text style={styles.coinsLabel}>My Coins</Text>
                                </View>
                                <Text style={styles.coinsValue}>
                                    {isSignedIn ? 'Profile' : 'Unlock'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.notificationsCard}
                                onPress={() => navigateProtected('/notifications')}
                            >
                                <View style={styles.notificationsIconContainer}>
                                    <Bell size={18} color="#64748b" />
                                </View>
                                <Text style={styles.notificationsText}>Notifications</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdropTouchable: {
        flex: 1,
    },
    sidebarContainer: {
        width: '80%',
        height: '100%',
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    gradient: {
        flex: 1,
        paddingHorizontal: 16,
        borderRightWidth: 1,
        borderRightColor: '#f0fdf4',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 48,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(16, 185, 129, 0.1)',
        paddingBottom: 24,
        paddingTop: 8,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logo: {
        width: 140,
        height: 35,
        resizeMode: 'contain',
    },
    closeButton: {
        padding: 8,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    navLinks: {
        gap: 8,
    },
    sidebarLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 6,
        backgroundColor: 'transparent',
    },
    sidebarLinkActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.1)',
    },
    sidebarLinkText: {
        fontWeight: '500',
        fontSize: 15,
        color: '#475569',
    },
    sidebarLinkTextActive: {
        color: '#064e3b',
        fontWeight: '600',
    },
    spacer: {
        flex: 1,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(16, 185, 129, 0.1)',
        paddingTop: 24,
        paddingBottom: 32,
        marginHorizontal: -16,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    avatarContainer: {
        height: 48,
        width: 48,
        backgroundColor: '#ecfdf5',
        borderRadius: 9999,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    avatar: {
        height: '100%',
        width: '100%',
    },
    userTextContainer: {
        flex: 1,
    },
    userName: {
        fontWeight: '700',
        color: '#1e293b',
        fontSize: 18,
    },
    userHandle: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    profileButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ffffff',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ecfdf5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    profileButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    logoutButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    logoutButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ef4444',
    },
    bottomSection: {
        gap: 12,
    },
    coinsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 251, 235, 0.8)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    coinsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    coinsIconContainer: {
        backgroundColor: '#fef3c7',
        padding: 8,
        borderRadius: 9999,
    },
    coinsLabel: {
        fontWeight: '600',
        color: '#1e293b',
    },
    coinsValue: {
        fontWeight: '700',
        color: '#b45309',
        fontSize: 18,
    },
    notificationsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    notificationsIconContainer: {
        backgroundColor: '#f1f5f9',
        padding: 8,
        borderRadius: 9999,
    },
    notificationsText: {
        fontWeight: '500',
        color: '#334155',
    },
});
