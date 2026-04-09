"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { skillsApi } from "@/lib/api/skills.api";

type SkillStatus = "validating" | "valid" | "invalid";

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
  const [validationStatus, setValidationStatus] = useState<SkillStatus | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchSkills = async (search?: string) => {
    if (skillsLoaded && !search) return;
    setIsLoadingSkills(true);
    try {
      const response = await skillsApi.getAllSkills(search, undefined, 100, 0);
      const skills =
        response.skills
          ?.map((s) => (typeof s?.name === "string" ? s.name.trim() : ""))
          .filter((n) => n.length > 0) ?? [];
      setAvailableSkills(skills);
      setSkillsLoaded(true);
    } catch (_error) {
      setAvailableSkills([]);
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const filteredSuggestions = availableSkills.filter((skill) => {
    if (typeof skill !== "string" || skill.trim() === "") return false;
    const q = inputValue.trim();
    if (q === "") return false;
    return (
      skill.toLowerCase().includes(q.toLowerCase()) &&
      !selectedSkills.includes(skill)
    );
  });

  const isValidNewSkill =
    inputValue.trim() !== "" &&
    !selectedSkills.includes(inputValue.trim()) &&
    !availableSkills.includes(inputValue.trim());

  const hasMultipleSkills =
    inputValue.includes(",") &&
    inputValue.split(",").some((skill) => skill.trim() !== "");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.trim() !== "");
    setHighlightedIndex(-1);
    setValidationStatus(null);
    setValidationError(null);
    if (value.trim() !== "") {
      fetchSkills(value.trim());
    }
  };

  const validateAndPersistSkill = useCallback(
    async (skillName: string) => {
      const normalizedSkill = skillName.trim();
      if (!normalizedSkill) return;

      setValidationStatus("validating");
      setShowSuggestions(false)
      setValidationError(null);

      try {
        await skillsApi.createSkill({ name: normalizedSkill });

        onSkillsChange([...selectedSkills, normalizedSkill]);
        setAvailableSkills((prev) =>
          prev.includes(normalizedSkill) ? prev : [...prev, normalizedSkill]
        );
        setValidationStatus(null);
        setInputValue("");
        setShowSuggestions(false);
      } catch (error) {
        const axiosError = error as {statusCode: number}

        if (axiosError.statusCode === 409) {
          // Already exists in DB — still valid, just add it
          onSkillsChange([...selectedSkills, normalizedSkill]);
          setAvailableSkills((prev) =>
            prev.includes(normalizedSkill) ? prev : [...prev, normalizedSkill]
          );
          setValidationStatus(null);
          setInputValue("");
          setShowSuggestions(false);
          return;
        }

        if (axiosError.statusCode === 400) {
          setValidationStatus("invalid");
          setValidationError(`"${normalizedSkill}" is not a valid skill`);
          setTimeout(() => {
            setValidationStatus(null);
            setInputValue("");
            setValidationError(null);
          }, 2000);
          return;
        }

        setValidationStatus("invalid");
        setValidationError("Could not validate skill. Please try again.");
        setTimeout(() => {
          setValidationStatus(null);
          setValidationError(null);
        }, 2000);
      }
    },
    [selectedSkills, onSkillsChange]
  );

  // Dropdown picks only — already in DB, skip validation
  const addExistingSkill = (skill: string) => {
    if (selectedSkills.length >= maxSkills) return;
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !selectedSkills.includes(trimmedSkill)) {
      onSkillsChange([...selectedSkills, trimmedSkill]);
    }
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const parseAndAddSkills = (input: string) => {
    const skills = input
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill !== "" && !selectedSkills.includes(skill));

    if (skills.length > 0) {
      setIsClickingSuggestion(true);
      const existingToAdd: string[] = [];
      const newToValidate: string[] = [];

      skills.forEach((skill) => {
        if (selectedSkills.length + existingToAdd.length >= maxSkills) return;
        if (availableSkills.includes(skill)) {
          existingToAdd.push(skill);
        } else {
          newToValidate.push(skill);
        }
      });

      if (existingToAdd.length > 0) {
        onSkillsChange([...selectedSkills, ...existingToAdd]);
      }
      newToValidate.forEach((skill) => void validateAndPersistSkill(skill));
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setInputValue("");
      setTimeout(() => setIsClickingSuggestion(false), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();

      if (validationStatus === "validating") return;

      if (inputValue.includes(",")) {
        parseAndAddSkills(inputValue);
        return;
      }

      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        // Selected from dropdown — existing skill, no validation
        addExistingSkill(filteredSuggestions[highlightedIndex]);
      } else if (isValidNewSkill) {
        // New skill typed — validate first
        void validateAndPersistSkill(inputValue.trim());
      }
      return;
    }

    if (!showSuggestions && filteredSuggestions.length === 0 && !isValidNewSkill) return;

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

  const removeSkill = (skillToRemove: string) => {
    onSkillsChange(selectedSkills.filter((skill) => skill !== skillToRemove));
  };

  const handleInputFocus = () => {
    if (inputValue.trim() !== "") setShowSuggestions(true);
    if (!skillsLoaded) fetchSkills();
  };

  const handleInputBlur = () => {
    if (isClickingSuggestion) return;
    setTimeout(() => {
      if (!isClickingSuggestion) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    }, 200);
  };

  const handleSuggestionClick = (skill: string) => {
    setIsClickingSuggestion(true);
    addExistingSkill(skill);
    setTimeout(() => setIsClickingSuggestion(false), 100);
  };

  const handleAddCustomSkill = () => {
    if (!isValidNewSkill || validationStatus === "validating") return;
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    void validateAndPersistSkill(inputValue.trim());
  };

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
      {label && <label className="text-sm font-medium">{label}</label>}

      {/* Selected badges */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedSkills.map((skill) => (
          <Badge
            key={skill}
            variant="secondary"
            className="pl-2 pr-1 py-1 gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-transparent font-medium"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="ml-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {skill}</span>
            </button>
          </Badge>
        ))}
      </div>

      <div className="relative overflow-visible">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pr-10"
          disabled={validationStatus === "validating"}
        />

        {/* + button — only shows for new skills not in DB */}
        {isValidNewSkill && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={validationStatus === "validating"}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0",
              validationStatus === "invalid" && "text-red-500 hover:text-red-500"
            )}
            onClick={handleAddCustomSkill}
            title={`Add "${inputValue.trim()}"`}
          >
            {validationStatus === "validating" && <Loader2 className="h-4 w-4 animate-spin" />}
            { validationStatus === "invalid" && <X className="h-4 w-4 text-red-500" />}
            {!validationStatus && <Plus className="h-4 w-4" />}
          </Button>
        )}

    

        {/* Suggestions dropdown */}
        {showSuggestions &&
          (filteredSuggestions.length > 0 || isValidNewSkill || hasMultipleSkills || isLoadingSkills) && (
            <div
              ref={suggestionsRef}
              className="absolute z-[999] w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {isLoadingSkills && (
                <div className="px-3 py-2 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading skills...</span>
                </div>
              )}

              {!isLoadingSkills &&
                filteredSuggestions.map((skill, index) => (
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

              {!isLoadingSkills && isValidNewSkill && !hasMultipleSkills && (
                <div
                  className={cn(
                    "px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border-t border-border",
                    highlightedIndex ===
                      filteredSuggestions.length + (hasMultipleSkills ? 1 : 0) &&
                      "bg-accent text-accent-foreground"
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
          
        {/* Error message below input */}
        {validationError && (
          <div className="mt-1  flex items-center gap-1 text-xs text-red-500 z-10">
            <AlertCircle className="h-3 w-3" />
            <span>{validationError}</span>
          </div>
        )}

      <p className="text-xs text-muted-foreground">
        {selectedSkills.length}/{maxSkills} skills selected
      </p>
    </div>
  );
}