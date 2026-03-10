import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface User {
  user_id: string;
  full_name: string;
  email: string;
}

interface MentionSuggestion {
  id: string;
  name: string;
  email: string;
}

interface UserMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: (value: string, mentions: string[]) => void;
  submitLabel?: string;
}

export const UserMentionTextarea: React.FC<UserMentionTextareaProps> = ({
  value,
  onChange,
  placeholder = "Add a comment...",
  className,
  onSubmit,
  submitLabel = "Submit"
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch all users for mentions
  const { data: users = [] } = useQuery({
    queryKey: ['mention-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .not('full_name', 'is', null)
        .order('full_name');
      
      if (error) throw error;
      return data as User[];
    },
  });

  const suggestions: MentionSuggestion[] = users
    .filter(user => 
      user.full_name.toLowerCase().includes(suggestionFilter.toLowerCase()) ||
      user.email.toLowerCase().includes(suggestionFilter.toLowerCase())
    )
    .slice(0, 5)
    .map(user => ({
      id: user.user_id,
      name: user.full_name,
      email: user.email
    }));

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(newCursorPosition);

    // Check for @ symbol and show suggestions
    const beforeCursor = newValue.substring(0, newCursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.substring(lastAtIndex + 1);
      
      // Check if there's a space after @ (which would end the mention)
      if (!afterAt.includes(' ')) {
        setSuggestionFilter(afterAt);
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: MentionSuggestion) => {
    if (mentionStart === -1) return;

    const beforeMention = value.substring(0, mentionStart);
    const afterCursor = value.substring(cursorPosition);
    const mentionText = `@${suggestion.name}`;
    
    const newValue = beforeMention + mentionText + ' ' + afterCursor;
    onChange(newValue);
    setShowSuggestions(false);
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Extract mentions from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*?)(?=\s|$|@)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1].trim();
      const user = users.find(u => u.full_name === mentionName);
      if (user) {
        mentions.push(user.user_id);
      }
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  };

  const handleSubmit = () => {
    if (!onSubmit || !value.trim()) return;
    
    const mentions = extractMentions(value);
    onSubmit(value, mentions);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={3}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto"
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium">{suggestion.name}</div>
              <div className="text-sm text-muted-foreground">{suggestion.email}</div>
            </div>
          ))}
        </div>
      )}
      
      {onSubmit && (
        <div className="mt-2 flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={!value.trim()}
            size="sm"
          >
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  );
};