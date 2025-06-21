import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserBadges, usePets } from '@/hooks/useDatabase';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { PaywallButton } from '@/components/ui/PaywallButton';
import { PetCard } from '@/components/ui/PetCard';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { LogOut, Crown, Star, CreditCard as Edit2, User, Heart, Bell, Settings } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, signOut, isLoading } = useAuth();
  const { badges, loading: badgesLoading } = useUserBadges();
  const { isSubscribed, currentSubscription, loading: subscriptionLoading } = useRevenueCat();
  const { debugInfo } = useSubscriptionStatus();
  const { pets, loading: petsLoading, deletePet, refetch } = usePets();
  const [signingOut, setSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'pets'>('user');
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Debug auth state
  useEffect(() => {
    console.log('Profile: Auth state changed', { 
      hasUser: !!user, 
      userEmail: user?.email,
      isLoading, 
      signingOut 
    });
  }, [user, isLoading, signingOut]);

  // Refresh pets data when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Refresh pets data when returning to this screen
      if (activeTab === 'pets') {
        refetch();
      }
    }, [activeTab, refetch])
  );

  // Get user data from auth
  const userName = user?.name || user?.full_name || 'Pet Parent';
  const userEmail = user?.email || 'user@email.com';

  const handleSignOut = async () => {
    console.log('Profile: handleSignOut called (direct logout)');
    
    setSigningOut(true);
    try {
      console.log('Profile: Starting logout process (direct)');
      
      const { error } = await signOut();
      
      if (error) {
        console.error('Profile: Logout error:', error);
        setSigningOut(false);
        return;
      }
      
      console.log('Profile: Logout successful, auth guard will handle redirect');
      
    } catch (error) {
      console.error('Profile: Unexpected logout error:', error);
      setSigningOut(false);
    }
  };

  const handleMenuPress = (item: string) => {
    console.log('Profile: handleMenuPress called with:', item, { signingOut, isLoading });
    
    if (signingOut || isLoading) {
      console.log('Profile: Menu press blocked by loading state');
      return;
    }
    
    switch (item) {
      case 'edit-profile':
        router.push('/(tabs)/profile/edit');
        break;
      case 'notifications':
        setShowNotificationModal(true);
        break;
      case 'subscription':
        // Always call presentPaywallIfNeeded - it will handle the subscription check internally
        handleShowPaywall();
        break;
      case 'logout':
        console.log('Profile: Calling handleSignOut');
        handleSignOut();
        break;
      default:
        router.push('/(tabs)/');
        break;
    }
  };

  const handleShowPaywall = async () => {
    const { presentPaywallIfNeeded } = useRevenueCat();
    
    try {
      // Use presentPaywallIfNeeded with 'premium' entitlement to match subscription status hook
      const result = await presentPaywallIfNeeded('premium');
      
      if (result?.success) {
        Alert.alert(
          'Welcome to Premium! 🎉',
          'You now have access to all premium features!',
          [{ text: 'Awesome!' }]
        );
      } else if (result?.error && !result.error.includes('cancelled')) {
        // Don't show error for user cancellation
        Alert.alert(
          'Subscription Error',
          result.error || 'Failed to show subscription options. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Paywall presentation error:', error);
      Alert.alert(
        'Error',
        'Failed to show subscription options. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleEditPet = (pet: any) => {
    router.push(`/pets/edit?id=${pet.id}`);
  };

  const handleDeletePet = (pet: any) => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to remove ${pet.name} from your pets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deletePet(pet.id);
            if (error) {
              Alert.alert('Error', 'Failed to delete pet. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handlePetPress = (pet: any) => {
    router.push(`/pets/details?id=${pet.id}`);
  };

  const handleAddPet = () => {
    router.push('/pets/add');
  };

  // Get user badges for display
  const userBadgesList = badges.slice(0, 3); // Show first 3 badges
  const defaultBadges = [
    { title: 'Pet Lover', image: require('@/assets/images/lover.png') },
    { title: 'Healthy Pup', image: require('@/assets/images/healthy-pup.png') },
    { title: 'Training Champ', image: require('@/assets/images/training-champ.png') },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Avatar */}
        <View style={styles.header}>
          {/* Paw Print Decorations */}
          <Text style={[styles.pawPrint, styles.paw1]}>🐾</Text>
          <Text style={[styles.pawPrint, styles.paw2]}>🐾</Text>
          <Text style={[styles.pawPrint, styles.paw3]}>🐾</Text>
          <Text style={[styles.pawPrint, styles.paw4]}>🐾</Text>
          <Text style={[styles.pawPrint, styles.paw5]}>🐾</Text>
          
          {/* User Avatar */}
          <View style={styles.avatarContainer}>
            <Image
              source={
                user?.avatar_url 
                  ? { uri: user.avatar_url }
                  : require('@/assets/images/login page icon.png')
              }
              style={styles.avatar}
              resizeMode="contain"
            />
            {/* Premium Badge */}
            {isSubscribed && (
              <View style={styles.premiumBadge}>
                <Crown size={16} color={Colors.white} />
              </View>
            )}
            
            {/* Edit Profile Button */}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleMenuPress('edit-profile')}
              disabled={isLoading || signingOut}
            >
              <Edit2 size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          {/* User Info */}
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          
          {/* Subscription Status Badge */}
          {!subscriptionLoading && (
            <View style={styles.subscriptionStatus}>
              {isSubscribed ? (
                <View style={styles.subscribedBadge}>
                  <Crown size={16} color="#ff9d00" />
                  <Text style={styles.subscribedText}>You are subscribed</Text>
                </View>
              ) : (
                <View style={styles.notSubscribedBadge}>
                  <Text style={styles.notSubscribedText}>Not subscribed</Text>
                  <PaywallButton 
                    title="Upgrade to Premium"
                    style={styles.upgradeButton}
                    onSuccess={() => {
                      // Refresh will happen automatically via subscription status hook
                    }}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'user' && styles.activeTab]}
            onPress={() => setActiveTab('user')}
          >
            <User size={20} color={activeTab === 'user' ? Colors.white : Colors.text} />
            <Text style={[styles.tabText, activeTab === 'user' && styles.activeTabText]}>
              User Profile
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pets' && styles.activeTab]}
            onPress={() => setActiveTab('pets')}
          >
            <Heart size={20} color={activeTab === 'pets' ? Colors.white : Colors.text} />
            <Text style={[styles.tabText, activeTab === 'pets' && styles.activeTabText]}>
              My Pets ({pets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'user' ? (
          <>
            {/* Stats Badges Container */}
            <View style={styles.statsContainer}>
          {defaultBadges.map((badge, index) => {
            const userBadge = userBadgesList[index];
            return (
              <View key={index} style={styles.statCard}>
                <Image
                  source={userBadge?.badge?.image_url ? { uri: userBadge.badge.image_url } : badge.image}
                  style={styles.statIcon}
                  resizeMode="contain"
                />
                <Text style={styles.statText}>
                  {userBadge?.badge?.title || badge.title}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Menu Container with Separators */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[
              styles.menuItem,
              (isLoading || signingOut) && styles.menuItemDisabled
            ]}
            onPress={() => handleMenuPress('edit-profile')}
            disabled={isLoading || signingOut}
          >
            <View style={styles.menuIconContainer}>
              <User size={20} color="#47463e" fill="#47463e" />
            </View>
            <Text style={styles.menuText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <View style={styles.separator} />

          <TouchableOpacity
            style={[
              styles.menuItem,
              (isLoading || signingOut) && styles.menuItemDisabled
            ]}
            onPress={() => handleMenuPress('notifications')}
            disabled={isLoading || signingOut}
          >
            <View style={styles.menuIconContainer}>
              <Bell size={20} color="#47463e" fill="#47463e" />
            </View>
            <Text style={styles.menuText}>Notification Preferences</Text>
          </TouchableOpacity>
          
          <View style={styles.separator} />

          <TouchableOpacity
            style={[
              styles.menuItem,
              (isLoading || signingOut) && styles.menuItemDisabled
            ]}
            onPress={() => handleMenuPress('subscription')}
            disabled={isLoading || signingOut}
          >
            <View style={styles.subscriptionMenuItem}>
              <View style={styles.menuIconContainer}>
                <Crown size={20} color="#47463e" fill="#47463e" />
              </View>
              <View style={styles.subscriptionMenuContent}>
                <Text style={styles.menuText}>Subscription</Text>
                {isSubscribed && (
                  <View style={styles.activeSubscriptionBadge}>
                    <Crown size={12} color={Colors.white} />
                    <Text style={styles.activeSubscriptionText}>Premium</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
          
          <View style={styles.separator} />

          <TouchableOpacity
            style={[
              styles.menuItem,
              (isLoading || signingOut) && styles.menuItemDisabled
            ]}
            onPress={() => handleMenuPress('logout')}
            disabled={isLoading || signingOut}
          >
            <View style={styles.menuIconContainer}>
              <LogOut size={20} color="#47463e" fill="#47463e" />
            </View>
            <Text style={[styles.menuText, { color: Colors.error }]}>
              {signingOut ? 'Logging out...' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>

            {/* User Stats Section */}
            {badges.length > 0 && (
              <View style={styles.badgesSection}>
                <Text style={styles.badgesSectionTitle}>Your Achievements</Text>
                <View style={styles.badgesGrid}>
                  {badges.map((userBadge, index) => (
                    <View key={index} style={styles.badgeItem}>
                      <Image
                        source={{ uri: userBadge.badge.image_url }}
                        style={styles.badgeIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.badgeTitle}>{userBadge.badge.title}</Text>
                      <Text style={styles.badgeDate}>
                        {new Date(userBadge.earned_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          /* Pet Profile Tab */
          <View style={styles.petsTabContent}>
            {petsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading your pets...</Text>
              </View>
            ) : pets.length === 0 ? (
              <View style={styles.emptyPetsContainer}>
                <Text style={styles.emptyPetsTitle}>No Pets Yet</Text>
                <Text style={styles.emptyPetsSubtitle}>
                  Add your first furry friend to get started with personalized care!
                </Text>
                <TouchableOpacity style={styles.addPetButton} onPress={handleAddPet}>
                  <Text style={styles.addPetButtonText}>+ Add Your First Pet</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.petsGrid}>
                <View style={styles.petsHeader}>
                  <Text style={styles.petsTitle}>My Pets ({pets.length})</Text>
                  <TouchableOpacity style={styles.addPetIconButton} onPress={handleAddPet}>
                    <Text style={styles.addPetIcon}>+</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={pets}
                  renderItem={({ item }) => (
                    <PetCard
                      pet={item}
                      onEdit={handleEditPet}
                      onDelete={handleDeletePet}
                      onPress={handlePetPress}
                    />
                  )}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.petsList}
                />
              </View>
            )}
          </View>
        )}

        {/* Debug Info Section (Development Only) */}
        {__DEV__ && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>🔧 RevenueCat Debug Info</Text>
            <Text style={styles.debugText}>Status: {debugInfo}</Text>
            <Text style={styles.debugText}>Loading: {subscriptionLoading ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>
              Subscription: {isSubscribed ? '✅ Active' : '❌ Inactive'}
            </Text>
            {currentSubscription && (
              <Text style={styles.debugText}>
                Product: {currentSubscription.productIdentifier}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Keep main background
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#fff9e3', 

  },
  pawPrint: {
    position: 'absolute',
    fontSize: 16,
    opacity: 0.3,
          color: '#544c3a', // VetPaw brown - consistent with brand
  },
  paw1: {
    top: 80,
    left: 30,
    transform: [{ rotate: '-15deg' }],
  },
  paw2: {
    top: 120,
    right: 40,
    transform: [{ rotate: '20deg' }],
  },
  paw3: {
    top: 100,
    right: 80,
    transform: [{ rotate: '-10deg' }],
  },
  paw4: {
    top: 140,
    left: 60,
    transform: [{ rotate: '25deg' }],
  },
  paw5: {
    top: 90,
    left: 100,
    transform: [{ rotate: '15deg' }],
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  premiumBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff9d00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  editButton: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  userName: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    opacity: 0.7,
    marginBottom: 12,
  },
  subscriptionStatus: {
    marginTop: 8,
  },
  subscribedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subscribedText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: '#28a745',
    marginLeft: 6,
  },
  notSubscribedBadge: {
    alignItems: 'center',
    gap: 12,
  },
  notSubscribedText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#666666',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9d00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.white,
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#ff9d00', // Primary orange border for warmth
    borderRadius: 16, // Slightly more rounded
    backgroundColor: Colors.placeholderbg, // Warm peachy background
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    textAlign: 'center',
    lineHeight: 16,
  },
  menuContainer: {
    marginHorizontal: 24,
    backgroundColor: '#ffffff', // Clean white background like reference
    borderRadius: 16, // Clean rounded corners
    borderColor: '#f0f0f0', // Subtle border
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa', // Light gray background like reference
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuEmoji: {
    fontSize: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#ff9d00', // Orange separator for consistency
    marginHorizontal: 20,
    opacity: 0.3, // Subtle appearance
  },
  menuText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    flex: 1,
  },
  subscriptionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subscriptionMenuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  activeSubscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9d00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeSubscriptionText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
    marginLeft: 4,
  },
  badgesSection: {
    marginHorizontal: 24,
    marginTop: 32,
  },
  badgesSectionTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  badgeTitle: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 10,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: Colors.placeholderbg, // Warm peachy background
    borderRadius: 25,
    padding: 4,
    borderWidth: 2,
    borderColor: '#ff9d00', // Orange border
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#ff9d00',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: '#544c3a',
  },
  activeTabText: {
    color: Colors.white,
  },
  // Pets Tab Styles
  petsTabContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
  },
  emptyPetsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyPetsTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 8,
  },
  emptyPetsSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addPetButton: {
    backgroundColor: '#ff9d00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addPetButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.white,
  },
  petsGrid: {
    flex: 1,
  },
  petsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  petsTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
  },
  addPetIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff9d00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addPetIcon: {
    fontSize: 24,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  petsList: {
    gap: 12,
  },
  // Debug section styles (Development only)
  debugSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFE0B2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff9d00',
  },
  debugTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#E65100',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#E65100',
    marginBottom: 4,
  },
});