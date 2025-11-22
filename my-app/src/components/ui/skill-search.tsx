"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { getGlobalSignInTrigger } from "@/hooks/use-require-auth";
import { skillsApi } from "@/lib/api/skills.api";

interface SkillSearchProps {
  placeholder?: string;
  className?: string;
  onSearch?: (skill: string) => void;
}

export function SkillSearch({ 
  placeholder = "What do you want to learn today?", 
  className = "",
  onSearch
}: SkillSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isSignedIn } = useUser();

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        fetchSuggestions(searchTerm);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchSuggestions = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await skillsApi.getAllSkills(query, undefined, 10);
      const skills = response.skills?.map(skill => skill.name) || [];
      setSuggestions(skills);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (searchTerm.trim()) {
          handleSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (skill: string) => {
    setSearchTerm(skill);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSearch = () => {
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return;

    if (isSignedIn) {
      // User is authenticated, redirect to browse page with search term
      router.push(`/browse?search=${encodeURIComponent(trimmedSearch)}`);
    } else {
      // User is not authenticated, trigger sign-in modal
      if (onSearch) {
        onSearch(trimmedSearch);
      } else {
        // If no onSearch callback provided, trigger the global sign-in modal
        // This ensures search works even without explicit callback
        const globalTrigger = getGlobalSignInTrigger();
        if (globalTrigger) {
          globalTrigger();
        }
      }
    }
  };

  const handleSearchClick = () => {
    handleSearch();
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary h-5 w-5" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="h-14 pl-12 pr-12 border-2 border-primary focus:border-primary text-base"
        />
        {isLoading ? (
          <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
        ) : (
          <button
            type="button"
            onClick={handleSearchClick}
            disabled={!searchTerm.trim()}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {suggestions.map((skill, index) => (
            <button
              key={skill}
              type="button"
              className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${
                index === selectedIndex ? "bg-muted" : ""
              }`}
              onClick={() => handleSuggestionClick(skill)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {skill}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
