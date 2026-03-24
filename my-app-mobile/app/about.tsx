import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Footer } from '../components/layout/footer';

export default function AboutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Stack.Screen options={{ title: 'About Webyalaya', headerBackTitleVisible: false }} />
      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold mb-8 text-foreground">
            About Webyalaya
          </Text>
          
          <View className="space-y-6">
            <Text className="text-base text-muted-foreground leading-6 mb-4">
              In this hyper-connected world, learning still feels lonely.
              We enroll in online courses with good intentions.
              But most of us never complete them.
              We save videos, tutorials, and links, but rarely go back to watch them.
            </Text>

            <Text className="text-base text-muted-foreground leading-6 mb-4">
              Not because we don’t want to learn,
              but because videos replaced conversations, courses replaced communities, 
              and for millions of us, especially outside the metros, language became another invisible barrier.
            </Text>

            <Text className="text-base text-muted-foreground leading-6 mb-4">
              Real learning needs people.{'\n'}
              Someone to ask questions with.{'\n'}
              Someone to explain things again.{'\n'}
              Someone to discuss, practice, and grow with.
            </Text>

            <Text className="text-base text-muted-foreground leading-6 mb-4">
              That’s the problem we felt personally.
              And that’s why we built Webyalaya.
            </Text>

            <Text className="text-base text-muted-foreground leading-6 mb-4">
              Webyalaya is designed to make learning social again.
              Instead of learning alone from a screen, you learn with peers.
              You talk, ask, explain, debate, and practice together, often in the language you’re most comfortable with.
            </Text>

            <Text className="text-base text-muted-foreground leading-6 mb-4">
              Here, learning flows both ways.
              You’re not just a learner.
              You also teach what you know.
            </Text>

            <Text className="text-base text-muted-foreground leading-6 mb-4">
              Because learning shouldn’t feel like a task.
              It should feel like something you want to come back to.
            </Text>

            <Text className="text-base text-foreground font-medium leading-6 mb-8">
              Together, let’s make learning a passion project.
            </Text>
          </View>
        </View>
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}
