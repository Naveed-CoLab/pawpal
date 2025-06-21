import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

const { width, height } = Dimensions.get('window');

/* -------------------------------------------------------------------------
   Slide data – keep only the data you actually need to localise or translate
   ------------------------------------------------------------------------- */
const slides = [
  {
    id: '1',
    title: 'Welcome to VetPaw!',
    description:
      'Meet your AI-powered pet care companion — designed for first-time pet parents. Get expert guidance, instant answers, and 24/7 support for your furry friend.',
    image: require('@/assets/images/Onboarding1 Image.png'),
    buttonText: '',
  },
  {
    id: '2',
    title: 'Your one‑stop pet‑care hub',
    description: '', // custom layout – no description line needed here
    image: null,
    buttonText: '',
  },
  {
    id: '3',
    title: 'Train, Bond & Grow Together 💬',
    description:
      'From live video coaching to behavior tips and mood insights — VetPaw helps you raise a happy, healthy pup from day one. Let’s make pet parenting stress-free and fun!',
    image: require('@/assets/images/paywall_vetpaw-removebg-preview.png'),
    buttonText: 'Try Free Version',
  },
] as const;

type Slide = (typeof slides)[number];

/* -------------------------------------------------------------------------
   Middle slide content (alternating text / image rows)
   ------------------------------------------------------------------------- */
const MiddleSlide = () => (
  <View style={styles.middleContainer}>
    {/* Row 1 */}
    <View style={styles.row}>
      <Text style={styles.leftText}>
        Everything your{"\n"}furry friend{"\n"}needs.
      </Text>
      <Image
        source={require('@/assets/images/Image (13).png')}
        style={styles.circle}
        resizeMode="contain"
      />
    </View>

    {/* Row 2 */}
    <View style={styles.row}>
      <Image
        source={require('@/assets/images/Image (16).png')}
        style={styles.circle}
        resizeMode="contain"
      />
      <Text style={styles.rightText}>
        From feeding{"\n"}schedules to{"\n"}training tips,
      </Text>
    </View>

    {/* Row 3 */}
    <View style={styles.row}>
      <Text style={styles.leftText}>We've it{"\n"}covered!</Text>
      <Image
        source={require('@/assets/images/Image (17).png')}
        style={styles.circle}
        resizeMode="contain"
      />
    </View>
  </View>
);

/* -------------------------------------------------------------------------
   Main component
   ------------------------------------------------------------------------- */
export default function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollView>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Animation values for Max
  const maxScale = useSharedValue(1);
  const maxRotate = useSharedValue(0);

  // simple shared‑value for fade‑through animation
  const fade = useSharedValue(1);

  // Load sound effect
  useEffect(() => {
    // Only load sound on native platforms
    if (Platform.OS !== 'web') {
      const loadSound = async () => {
        try {
          // Use a default sound from Expo AV
          const { sound } = await Audio.Sound.createAsync(
            require('@/assets/sounds/woof.mp3'),
            { shouldPlay: false }
          );
          setSound(sound);
          console.log('Sound loaded successfully');
        } catch (error) {
          console.error('Error loading sound:', error);
        }
      };
      
      loadSound();
    }
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Handle tapping Max
  const handleTapMax = async () => {
    // Play sound if available
    if (sound && Platform.OS !== 'web') {
      try {
        await sound.replayAsync();
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
    
    // Animate Max with a joyful bounce
    maxScale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withSpring(0.9, { damping: 4 }),
      withSpring(1.1, { damping: 4 }),
      withSpring(1, { damping: 4 })
    );
    
    // Add a little rotation for extra joy
    maxRotate.value = withSequence(
      withTiming(-5, { duration: 100 }),
      withTiming(5, { duration: 200 }),
      withTiming(0, { duration: 100 })
    );
  };

  // Animated style for Max
  const animatedMaxStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: maxScale.value },
        { rotate: `${maxRotate.value}deg` }
      ]
    };
  });

  // helper in JS context ➜ safe to call from a worklet
  const scrollToIndex = (idx: number) => {
    ref.current?.scrollTo({ x: width * idx, animated: true });
  };

  const next = () => {
    if (page < slides.length - 1) {
      // fade‑out on the UI thread, then run the JS scroll via runOnJS
      fade.value = withTiming(
        0,
        { duration: 200, easing: Easing.out(Easing.ease) },
        () => {
          runOnJS(scrollToIndex)(page + 1); // avoid touching ref inside the worklet
        },
      );
    } else {
      router.replace('/auth');
    }
  };


  const onMomentumEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    runOnJS(setPage)(idx);
    fade.value = withTiming(1, { duration: 250, easing: Easing.in(Easing.ease) });
  };

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: fade.value * 0.1 + 0.9 }],
  }));

  return (
    <View style={styles.screen}>
      {/* -------------------------------------------------------------------
           Swipeable area
           ------------------------------------------------------------------- */}
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {slides.map((slide: Slide, i) => (
          <Animated.View key={slide.id} style={[styles.page, { width }, fadeStyle]}>
            {/* fixed title strip */}
            <Text style={styles.title}>{slide.title}</Text>

            {/* content band */}
            <View style={styles.content}>
              {i === 1 ? (
                <MiddleSlide />
              ) : (
                <>
                  {i === 0 ? (
                    <TouchableOpacity onPress={handleTapMax} activeOpacity={0.8}>
                      <Animated.Image 
                        source={slide.image} 
                        style={[styles.hero, animatedMaxStyle]} 
                        resizeMode="contain" 
                      />
                      <Text style={styles.tapText}>Tap Max to say hi!</Text>
                    </TouchableOpacity>
                  ) : (
                    <Image source={slide.image} style={styles.hero} resizeMode="contain" />
                  )}
                  <Text style={styles.desc}>{slide.description}</Text>
                </>
              )}
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* -------------------------------------------------------------------
           Bottom nav / CTA
           ------------------------------------------------------------------- */}
      {page < slides.length - 1 ? (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.replace('/auth')}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextTxt}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.ctaWrap}>
          <TouchableOpacity style={styles.cta} onPress={() => router.replace('/auth')}>
            <Image
              source={require('@/assets/images/VetPaw icon.png')}
              style={styles.paw}
              resizeMode="contain"
            />
            <Text style={styles.ctaTxt}>{slides[page].buttonText}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------
   Styles
   ------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF8E1' },
  page: { flex: 1, alignItems: 'center' },
  title: {
    position: 'absolute',
    top: height * 0.15,
    width: '80%',
    textAlign: 'center',
    fontSize: 26,
    fontFamily: Fonts.heading.bold,
    color: '#311B0B',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: { width: width * 0.55, height: width * 0.55, marginBottom: 24 },
  desc: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: '#311B0B',
    textAlign: 'center',
    lineHeight: 24,
  },
  tapText: {
    marginTop: 18,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.primary,
    textAlign: 'center',
  },
  middleContainer: { width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    justifyContent: 'space-between',
  },
  circle: { width: width * 0.28, height: width * 0.28 },
  leftText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#311B0B',
    lineHeight: 18,
    width: '50%',
  },
  rightText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#311B0B',
    lineHeight: 18,
    width: '50%',
    textAlign: 'right',
  },
  navBar: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skip: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#311B0B',
    opacity: 0.6,
  },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F9A826',
    opacity: 0.3,
    marginHorizontal: 3,
  },
  dotActive: { opacity: 1 },
  nextBtn: { paddingHorizontal: 20, paddingVertical: 6 },
  nextTxt: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#F9A826',
  },
  ctaWrap: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
  },
  cta: {
    backgroundColor: '#F9A826',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  paw: { width: 22, height: 22, marginRight: 8 },
  ctaTxt: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: Fonts.body.bold,
  },
});