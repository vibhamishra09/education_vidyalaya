import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { X, Save, Plus, Trash2 } from 'lucide-react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SocialLink {
  platform: string;
  url: string;
}

interface UserProfile {
  name: string;
  bio: string;
  hasSkills: string[];
  wantSkills: string[];
  socialLinks: SocialLink[];
}

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updatedUser: UserProfile) => void;
}

export function EditProfileModal({ visible, onClose, user, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState<UserProfile>(user);
  const [newHasSkill, setNewHasSkill] = useState('');
  const [newWantSkill, setNewWantSkill] = useState('');
  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  const handleChange = (key: keyof UserProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddHasSkill = () => {
    if (newHasSkill.trim()) {
      setFormData((prev) => ({
        ...prev,
        hasSkills: [...prev.hasSkills, newHasSkill.trim()],
      }));
      setNewHasSkill('');
    }
  };

  const handleRemoveHasSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      hasSkills: prev.hasSkills.filter((_, i) => i !== index),
    }));
  };

  const handleAddWantSkill = () => {
    if (newWantSkill.trim()) {
      setFormData((prev) => ({
        ...prev,
        wantSkills: [...prev.wantSkills, newWantSkill.trim()],
      }));
      setNewWantSkill('');
    }
  };

  const handleRemoveWantSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      wantSkills: prev.wantSkills.filter((_, i) => i !== index),
    }));
  };
  
  const handleAddSocialLink = () => {
    if (newSocialPlatform.trim() && newSocialUrl.trim()) {
      setFormData((prev) => ({
        ...prev,
        socialLinks: [...prev.socialLinks, { platform: newSocialPlatform.trim(), url: newSocialUrl.trim() }],
      }));
      setNewSocialPlatform('');
      setNewSocialUrl('');
    }
  };

  const handleRemoveSocialLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={24} className="text-slate-500 dark:text-slate-400" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="space-y-6">
            {/* Name */}
            <View>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</Text>
              <TextInput
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="Your name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Bio */}
            <View>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bio</Text>
              <TextInput
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white h-24 text-top"
                value={formData.bio}
                onChangeText={(text) => handleChange('bio', text)}
                placeholder="Tell us about yourself"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Skills (hasSkills) */}
            <View>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">I can teach (Stack)</Text>
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  value={newHasSkill}
                  onChangeText={setNewHasSkill}
                  placeholder="Add a skill you have"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity 
                  onPress={handleAddHasSkill}
                  className="bg-emerald-600 p-3 rounded-xl"
                >
                  <Plus size={24} color="white" />
                </TouchableOpacity>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {formData.hasSkills.map((skill, index) => (
                  <View key={index} className="flex-row items-center bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                    <Text className="text-emerald-700 dark:text-emerald-300 mr-2">{skill}</Text>
                    <TouchableOpacity onPress={() => handleRemoveHasSkill(index)}>
                      <X size={14} className="text-emerald-500" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Interests (wantSkills) */}
            <View>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">I want to learn (Interests)</Text>
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  value={newWantSkill}
                  onChangeText={setNewWantSkill}
                  placeholder="Add a skill you want"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity 
                  onPress={handleAddWantSkill}
                  className="bg-sky-600 p-3 rounded-xl"
                >
                  <Plus size={24} color="white" />
                </TouchableOpacity>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {formData.wantSkills.map((skill, index) => (
                  <View key={index} className="flex-row items-center bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 rounded-full border border-sky-100 dark:border-sky-800">
                    <Text className="text-sky-700 dark:text-sky-300 mr-2">{skill}</Text>
                    <TouchableOpacity onPress={() => handleRemoveWantSkill(index)}>
                      <X size={14} className="text-sky-500" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Social Links */}
             <View>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Social Links</Text>
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  value={newSocialPlatform}
                  onChangeText={setNewSocialPlatform}
                  placeholder="Platform (e.g. GitHub)"
                  placeholderTextColor="#94a3b8"
                />
                 <TextInput
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  value={newSocialUrl}
                  onChangeText={setNewSocialUrl}
                  placeholder="URL"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity 
                  onPress={handleAddSocialLink}
                  className="bg-slate-800 p-3 rounded-xl"
                >
                  <Plus size={24} color="white" />
                </TouchableOpacity>
              </View>
              <View className="gap-2">
                {formData.socialLinks.map((link, index) => (
                  <View key={index} className="flex-row items-center justify-between bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl">
                    <View className="flex-1">
                        <Text className="text-slate-900 dark:text-white font-medium">{link.platform}</Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-xs" numberOfLines={1}>{link.url}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveSocialLink(index)} className="p-2">
                      <Trash2 size={18} className="text-red-500" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

          </View>
        </ScrollView>

        <View className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pb-8">
          <TouchableOpacity 
            onPress={handleSave}
            className="w-full bg-slate-900 dark:bg-white py-4 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Save size={20} className="text-white dark:text-slate-900" />
            <Text className="text-white dark:text-slate-900 font-bold text-lg">Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
