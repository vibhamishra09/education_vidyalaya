"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillInput } from "@/components/ui/skill-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { usersApi } from "@/lib/api";
import { User, UpdateUserDto } from "@/types/api.types";
import { setAuthToken } from "@/lib/api-client";
import { uploadFile, validateImageFile } from "@/lib/upload";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  user,
  onUserUpdate,
}: EditProfileModalProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Form state
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [location, setLocation] = useState(user.location || "");
  const [school, setSchool] = useState(user.school || "");
  const [hourlyRate, setHourlyRate] = useState<number | string>(
    user.hourlyRate ? (typeof user.hourlyRate === 'number' ? user.hourlyRate * 100 : parseFloat(user.hourlyRate) * 100) : ""
  ); // Convert AYA to mAYA for display
  const [hasSkills, setHasSkills] = useState<string[]>(user.hasSkills || []);
  const [wantSkills, setWantSkills] = useState<string[]>(user.wantSkills || []);
  
  // Username validation state
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Reset form when user changes
  useEffect(() => {
    setAvatar(user.avatar || "");
    setUsername(user.username || "");
    setBio(user.bio || "");
    setLocation(user.location || "");
    setSchool(user.school || "");
    setHourlyRate(
      user.hourlyRate ? (typeof user.hourlyRate === 'number' ? user.hourlyRate * 100 : parseFloat(user.hourlyRate) * 100) : ""
    ); // Convert AYA to mAYA for display
    setHasSkills(user.hasSkills || []);
    setWantSkills(user.wantSkills || []);
    setError(null);
    setUsernameError(null);
    setUsernameAvailable(null);
  }, [user, isOpen]);

  // Debounced username availability check
  useEffect(() => {
    const checkUsername = async () => {
      const trimmedUsername = username.trim();
      
      // Reset state
      setUsernameError(null);
      setUsernameAvailable(null);
      
      // Skip if empty or unchanged
      if (!trimmedUsername) {
        return;
      }
      
      // Validate format
      if (trimmedUsername.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        setUsernameAvailable(false);
        return;
      }
      
      if (trimmedUsername.length > 30) {
        setUsernameError('Username must be at most 30 characters');
        setUsernameAvailable(false);
        return;
      }
      
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
        setUsernameAvailable(false);
        return;
      }
      
      // If username hasn't changed, mark as available
      if (trimmedUsername === user.username) {
        setUsernameAvailable(true);
        return;
      }
      
      // Check availability
      setCheckingUsername(true);
      try {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
        const result = await usersApi.checkUsernameAvailability(trimmedUsername);
        setUsernameAvailable(result.available);
        if (!result.available) {
          setUsernameError('Username is already taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameError('Failed to check username availability');
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    };
    
    const timeoutId = setTimeout(checkUsername, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [username, user.username, getToken]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    try {
      // Get auth token
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      // Upload file
      const fileUrl = await uploadFile(file, 'avatar');
      setAvatar(fileUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingAvatar(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Get token and set it for API calls
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      
      // Convert hourlyRate to number, handling empty strings
      // If empty string, don't include it (preserves original value on backend)
      // If valid number (including 0), include it
      let hourlyRateValue: number | undefined = undefined;
      if (hourlyRate !== "" && hourlyRate !== null && hourlyRate !== undefined) {
        const numValue = typeof hourlyRate === 'number' ? hourlyRate : parseFloat(String(hourlyRate));
        if (!isNaN(numValue)) {
          hourlyRateValue = numValue / 100; // Convert mAYA input to AYA for storage
        }
      }
      
      // Validate username before submitting
      const trimmedUsername = username.trim();
      if (trimmedUsername && usernameError) {
        setError('Please fix the username errors before saving');
        return;
      }
      
      if (trimmedUsername && usernameAvailable === false) {
        setError('Username is not available. Please choose a different one.');
        return;
      }
      
      const updateData: UpdateUserDto = {
        avatar: avatar || undefined,
        username: trimmedUsername || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        school: school.trim() || undefined,
        ...(hourlyRateValue !== undefined ? { hourlyRate: hourlyRateValue } : {}),
        hasSkills,
        wantSkills,
      };
      
      const response = await usersApi.updateUserProfile(updateData);
      onUserUpdate(response.user);
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and skills.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24 border-2 border-primary-200">
              <AvatarImage src={avatar} alt="Profile" />
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingAvatar || loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar || loading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                  </span>
                </Button>
              </label>
            </div>
            {uploadingAvatar && (
              <p className="text-xs text-muted-foreground">Uploading image...</p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="e.g., johndoe123"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                  setUsername(value);
                }}
                maxLength={30}
                className={usernameError ? "border-destructive" : usernameAvailable === true ? "border-green-500" : ""}
              />
              {checkingUsername && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!checkingUsername && usernameAvailable === true && username.trim() && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
              )}
            </div>
            {usernameError ? (
              <p className="text-xs text-destructive">{usernameError}</p>
            ) : username.trim() && usernameAvailable === true ? (
              <p className="text-xs text-green-600">Username is available</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                3-30 characters, letters, numbers, underscores, and hyphens only
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., New York, USA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your city or general location
            </p>
          </div>

          {/* School/Institution */}
          <div className="space-y-2">
            <Label htmlFor="school">School/Institution</Label>
            <Input
              id="school"
              placeholder="e.g., MIT, Harvard University"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your school, university, or institution name
            </p>
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate (<span className="text-xs">m</span>AYA)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">🪙</span>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={hourlyRate === "" ? "" : hourlyRate}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setHourlyRate("");
                  } else {
                    const numValue = parseFloat(value);
                    setHourlyRate(isNaN(numValue) ? "" : numValue);
                  }
                }}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Set your hourly rate in mAYA tokens for teaching sessions. Leave empty or 0 to not display a rate.
            </p>
          </div>

          {/* Skills I Can Teach */}
          <SkillInput
            label="Skills I Can Teach"
            placeholder="Type skills separated by commas (e.g., JavaScript, React, Node.js)..."
            selectedSkills={hasSkills}
            onSkillsChange={setHasSkills}
            maxSkills={20}
          />

          {/* Skills I Want to Learn */}
          <SkillInput
            label="Skills I Want to Learn"
            placeholder="Type skills separated by commas (e.g., Python, Machine Learning, AWS)..."
            selectedSkills={wantSkills}
            onSkillsChange={setWantSkills}
            maxSkills={20}
          />

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

