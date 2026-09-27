import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { ParsedVideoSource, createAnnotation, parseSharedContent } from '../services/shareIntent';
import { NoteItem } from '../services/supabase';

interface ComposeModalProps {
  visible: boolean;
  source: ParsedVideoSource | null;
  onClose: () => void;
  onSuccess: (newNote: NoteItem) => void;
}

const EMOJI_OPTIONS = [
  { emoji: '💡', label: 'Idea' },
  { emoji: '🔥', label: 'Hot' },
  { emoji: '🤔', label: 'Think' },
  { emoji: '🔍', label: 'Truth' },
  { emoji: '🛑', label: 'Dispute' },
];

export const ComposeModal: React.FC<ComposeModalProps> = ({
  visible,
  source,
  onClose,
  onSuccess,
}) => {
  const [urlInput, setUrlInput] = useState(source?.rawUrl || '');
  const [activePlatform, setActivePlatform] = useState(source?.platform || 'web');
  const [commentary, setCommentary] = useState('');
  const [quoteText, setQuoteText] = useState(source?.quoteText || source?.displayTitle || '');
  const [timestamp, setTimestamp] = useState(source?.formattedTime || '00:00');
  const [selectedEmoji, setSelectedEmoji] = useState('💡');
  const [factCheckClaim, setFactCheckClaim] = useState('');
  const [factCheckVerdict, setFactCheckVerdict] = useState<'VERIFIED' | 'FALSE' | 'CONTEXT_NEEDED'>('VERIFIED');
  const [showFactCheck, setShowFactCheck] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync state when incoming source changes
  useEffect(() => {
    if (source) {
      setUrlInput(source.rawUrl || '');
      setActivePlatform(source.platform || 'web');
      setQuoteText(source.quoteText || source.displayTitle || '');
      setTimestamp(source.formattedTime || '00:00');
    } else {
      setUrlInput('');
      setActivePlatform('web');
      setQuoteText('');
      setTimestamp('00:00');
    }
  }, [source]);

  const handleUrlChange = (text: string) => {
    setUrlInput(text);
    const parsed = parseSharedContent(text);
    if (parsed) {
      setActivePlatform(parsed.platform);
      setQuoteText(parsed.quoteText || parsed.displayTitle || '');
      setTimestamp(parsed.formattedTime || '00:00');
    }
  };

  const handleSubmit = async () => {
    if (!commentary.trim()) {
      alert('Please enter your annotation commentary.');
      return;
    }
    if (!urlInput.trim()) {
      alert('Please provide a source URL.');
      return;
    }

    setLoading(true);
    try {
      const newNote = await createAnnotation({
        url: urlInput.trim(),
        sourceDomain: activePlatform === 'youtube' ? 'youtube.com' : activePlatform === 'x' ? 'x.com' : 'web',
        quoteText: quoteText.trim() ? (timestamp !== '00:00' ? `[${timestamp}] ${quoteText}` : quoteText) : undefined,
        commentary: commentary.trim(),
        emoji: selectedEmoji,
        factCheckClaim: showFactCheck && factCheckClaim.trim() ? factCheckClaim.trim() : undefined,
        factCheckVerdict: showFactCheck ? factCheckVerdict : undefined,
      });

      setLoading(false);
      if (newNote) {
        setCommentary('');
        setFactCheckClaim('');
        setShowFactCheck(false);
        setUrlInput('');
        onSuccess(newNote);
      }
    } catch (err) {
      setLoading(false);
      alert('Error creating annotation. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>DROP ANNOTATION</Text>
              <View style={styles.platformBadge}>
                <Text style={styles.platformBadgeText}>
                  {activePlatform.toUpperCase()}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
              {/* URL Input */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>SOURCE URL (Paste YouTube or X Link)</Text>
                <TextInput
                  style={styles.textInput}
                  value={urlInput}
                  onChangeText={handleUrlChange}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Timestamp & Video Title / Highlighted Quote */}
              <View style={styles.inputRow}>
                {activePlatform === 'youtube' && (
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.fieldLabel}>TIME</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={timestamp}
                      onChangeText={setTimestamp}
                      placeholder="00:00"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                )}
                <View style={styles.titleInputContainer}>
                  <Text style={styles.fieldLabel}>HIGHLIGHTED QUOTE / CLAIM</Text>
                  <TextInput
                    style={styles.textInput}
                    value={quoteText}
                    onChangeText={setQuoteText}
                    placeholder="Selected quote or claim..."
                    placeholderTextColor={Colors.textMuted}
                    multiline={true}
                  />
                </View>
              </View>

              {/* Commentary Input */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>YOUR ANNOTATION *</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={commentary}
                onChangeText={setCommentary}
                placeholder="What should people know about this moment?"
                placeholderTextColor={Colors.textMuted}
                multiline
              />

              {/* Emoji Selection */}
              <Text style={[styles.fieldLabel, { marginTop: 16, marginBottom: 8 }]}>INTENT</Text>
              <View style={styles.emojiRow}>
                {EMOJI_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.emoji}
                    style={[styles.emojiButton, selectedEmoji === opt.emoji && styles.emojiButtonActive]}
                    onPress={() => setSelectedEmoji(opt.emoji)}
                  >
                    <Text style={styles.emojiText}>{opt.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fact Check Toggle */}
              <View style={styles.factCheckSection}>
                <TouchableOpacity
                  style={styles.factCheckToggle}
                  onPress={() => setShowFactCheck(!showFactCheck)}
                >
                  <Text style={styles.factCheckToggleText}>
                    {showFactCheck ? '− REMOVE FACT CHECK' : '+ ADD FACT CHECK (GEMINI)'}
                  </Text>
                </TouchableOpacity>

                {showFactCheck && (
                  <View style={styles.factCheckBox}>
                    <View style={styles.verdictRow}>
                      <TouchableOpacity
                        style={[styles.verdictButton, factCheckVerdict === 'VERIFIED' && styles.verdictActiveVerified]}
                        onPress={() => setFactCheckVerdict('VERIFIED')}
                      >
                        <Text style={{ color: Colors.emerald, fontWeight: '700', fontSize: 11 }}>VERIFIED</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.verdictButton, factCheckVerdict === 'CONTEXT_NEEDED' && styles.verdictActiveContext]}
                        onPress={() => setFactCheckVerdict('CONTEXT_NEEDED')}
                      >
                        <Text style={{ color: Colors.cyan, fontWeight: '700', fontSize: 11 }}>CONTEXT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.verdictButton, factCheckVerdict === 'FALSE' && styles.verdictActiveFalse]}
                        onPress={() => setFactCheckVerdict('FALSE')}
                      >
                        <Text style={{ color: Colors.falseClaim, fontWeight: '700', fontSize: 11 }}>FALSE</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={[styles.textInput, { marginTop: 10, height: 60 }]}
                      value={factCheckClaim}
                      onChangeText={setFactCheckClaim}
                      placeholder="Fact-check citation or primary source link..."
                      placeholderTextColor={Colors.textMuted}
                      multiline
                    />
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitButtonText}>PUBLISH TO NETWORK</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '75%',
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  platformBadge: {
    backgroundColor: Colors.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: Colors.textMuted,
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  formGroup: {
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInputContainer: {
    width: 70,
  },
  titleInputContainer: {
    flex: 1,
  },
  fieldLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  timeInput: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: Colors.cyan,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiButtonActive: {
    backgroundColor: '#0F2840',
    borderColor: Colors.cyan,
    borderWidth: 2,
  },
  emojiText: {
    fontSize: 18,
  },
  factCheckSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  factCheckToggle: {
    alignSelf: 'flex-start',
  },
  factCheckToggleText: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '800',
  },
  factCheckBox: {
    marginTop: 12,
    backgroundColor: 'rgba(5, 46, 22, 0.3)',
    borderColor: Colors.emerald,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  verdictRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verdictButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  verdictActiveVerified: {
    borderColor: Colors.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  verdictActiveContext: {
    borderColor: Colors.cyan,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  verdictActiveFalse: {
    borderColor: Colors.falseClaim,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.cyan,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});


