"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { skillsApi } from "@/lib/api/skills.api";

interface SkillInputProps {
  placeholder?: string;
  label?: string;
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  maxSkills?: number;
  className?: string;
}

export function SkillInput({
  placeholder = "Type a skill...",
  label,
  selectedSkills,
  onSkillsChange,
  maxSkills = 50,
  className,
}: SkillInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [skillsLoaded, setSkillsLoaded] = useState(false);
  const [isClickingSuggestion, setIsClickingSuggestion] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch skills from API
  const fetchSkills = async (search?: string) => {
    if (skillsLoaded && !search) return; // Don't refetch if already loaded and no search
    
    setIsLoadingSkills(true);
    try {
      const response = await skillsApi.getAllSkills(search, undefined, 100, 0);
      const skills = response.skills?.map(skill => skill.name) || [];
      setAvailableSkills(skills);
      setSkillsLoaded(true);
    } catch (error) {
      console.error('Error fetching skills:', error);
      // Fallback to empty array if API fails
      setAvailableSkills([]);
    } finally {
      setIsLoadingSkills(false);
    }
  };

  // Filter suggestions based on input and exclude already selected skills
  const filteredSuggestions = availableSkills.filter(
    (skill) =>
      skill.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedSkills.includes(skill) &&
      inputValue.trim() !== ""
  );

  // Check if input value is a valid new skill
  const isValidNewSkill = inputValue.trim() !== "" && 
    !selectedSkills.includes(inputValue.trim()) &&
    !availableSkills.includes(inputValue.trim());

  // Check if input contains multiple skills separated by commas
  const hasMultipleSkills = inputValue.includes(",") && 
    inputValue.split(",").some(skill => skill.trim() !== "");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.trim() !== "");
    setHighlightedIndex(-1);
    
    // Fetch skills when user starts typing
    if (value.trim() !== "") {
      fetchSkills(value.trim());
    }
  };

  const parseAndAddSkills = (input: string) => {
    const skills = input
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill !== "" && !selectedSkills.includes(skill));
    
    if (skills.length > 0) {
      setIsClickingSuggestion(true);
      const newSkills = [...selectedSkills];
      skills.forEach(skill => {
        if (newSkills.length < maxSkills && !newSkills.includes(skill)) {
          newSkills.push(skill);
        }
      });
      onSkillsChange(newSkills);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setInputValue("");
      setTimeout(() => setIsClickingSuggestion(false), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      
      // Check if input contains commas for multiple skills
      if (inputValue.includes(",")) {
        parseAndAddSkills(inputValue);
        setInputValue("");
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        return;
      }
      
      // Single skill selection (existing logic)
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addSkill(filteredSuggestions[highlightedIndex]);
      } else if (isValidNewSkill) {
        addSkill(inputValue.trim());
      }
      return;
    }

    if (!showSuggestions && filteredSuggestions.length === 0 && !isValidNewSkill) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Escape":
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const addSkill = (skill: string) => {
    if (selectedSkills.length >= maxSkills) return;
    
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !selectedSkills.includes(trimmedSkill)) {
      onSkillsChange([...selectedSkills, trimmedSkill]);
    }
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const removeSkill = (skillToRemove: string) => {
    onSkillsChange(selectedSkills.filter((skill) => skill !== skillToRemove));
  };

  const handleInputFocus = () => {
    if (inputValue.trim() !== "") {
      setShowSuggestions(true);
    }
    // Load initial skills when focusing
    if (!skillsLoaded) {
      fetchSkills();
    }
  };

  const handleInputBlur = () => {
    // Don't hide suggestions if we're clicking on a suggestion
    if (isClickingSuggestion) return;
    
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!isClickingSuggestion) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    }, 200);
  };

  const handleSuggestionClick = (skill: string) => {
    setIsClickingSuggestion(true);
    addSkill(skill);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setInputValue("");
    // Reset clicking state after a short delay
    setTimeout(() => setIsClickingSuggestion(false), 100);
  };

  const handleAddCustomSkill = () => {
    if (isValidNewSkill) {
      setIsClickingSuggestion(true);
      addSkill(inputValue.trim());
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setInputValue("");
      setTimeout(() => setIsClickingSuggestion(false), 100);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="text-sm font-medium">{label}</label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pr-10"
        />
        
        {/* Add custom skill button */}
        {isValidNewSkill && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            onClick={handleAddCustomSkill}
            title={`Add "${inputValue.trim()}"`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && (filteredSuggestions.length > 0 || isValidNewSkill || hasMultipleSkills || isLoadingSkills) && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {/* Loading state */}
            {isLoadingSkills && (
              <div className="px-3 py-2 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading skills...</span>
              </div>
            )}
            
            {/* Available suggestions */}
            {!isLoadingSkills && filteredSuggestions.map((skill, index) => (
              <div
                key={skill}
                className={cn(
                  "px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground",
                  highlightedIndex === index && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(skill);
                }}
              >
                {skill}
              </div>
            ))}
            
            {/* Multiple skills option */}
            {!isLoadingSkills && hasMultipleSkills && (
              <div
                className={cn(
                  "px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border-t border-border",
                  highlightedIndex === filteredSuggestions.length && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  parseAndAddSkills(inputValue);
                }}
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add multiple skills</span>
                </div>
              </div>
            )}
            
            {/* Custom skill option */}
            {!isLoadingSkills && isValidNewSkill && !hasMultipleSkills && (
              <div
                className={cn(
                  "px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border-t border-border",
                  highlightedIndex === filteredSuggestions.length + (hasMultipleSkills ? 1 : 0) && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddCustomSkill();
                }}
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add &quot;{inputValue.trim()}&quot;</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected skills */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSkills.map((skill) => (
            <Badge
              key={skill}
              variant="default"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => removeSkill(skill)}
            >
              {skill}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Skill count */}
      <p className="text-xs text-muted-foreground">
        {selectedSkills.length}/{maxSkills} skills selected
      </p>
    </div>
  );
}
