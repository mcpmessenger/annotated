import React, { useState } from 'react';
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
import { ParsedVideoSource, createAnnotation } from '../services/shareIntent';
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
  { emoji: '💯', label: 'Truth' },
  { emoji: '👎', label: 'Dispute' },
];

export const ComposeModal: React.FC<ComposeModalProps> = ({
  visible,
  source,
  onClose,
  onSuccess,
}) => {
  const [commentary, setCommentary] = useState('');
  const [quoteText, setQuoteText] = useState(source?.displayTitle || '');
  const [timestamp, setTimestamp] = useState(source?.formattedTime || '00:00');
  const [selectedEmoji, setSelectedEmoji] = useState('💡');
  const [factCheckClaim, setFactCheckClaim] = useState('');
  const [factCheckVerdict, setFactCheckVerdict] = useState<'VERIFIED' | 'FALSE' | 'CONTEXT_NEEDED'>('VERIFIED');
  const [showFactCheck, setShowFactCheck] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync quote title when source changes
  React.useEffect(() => {
    if (source) {
      setQuoteText(source.displayTitle || '');
      setTimestamp(source.formattedTime || '00:00');
    }
  }, [source]);

  const handleSubmit = async () => {
    if (!commentary.trim()) {
      alert('Please enter your annotation commentary.');
      return;
    }

    setLoading(true);
    try {
      const newNote = await createAnnotation({
        url: source?.rawUrl || 'https://youtube.com',
        sourceDomain: source?.platform === 'youtube' ? 'youtube.com' : source?.platform === 'x' ? 'x.com' : 'web',
        quoteText: quoteText.trim() ? `[${timestamp}] ${quoteText}` : undefined,
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
                  {source?.platform?.toUpperCase() || 'WEB'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Target URL Pill */}
            <View style={styles.urlBox}>
              <Text style={styles.urlLabel}>SOURCE LINK</Text>
              <Text style={styles.urlText} numberOfLines={1}>
                {source?.rawUrl || 'No URL detected'}
              </Text>
            </View>

            {/* Timestamp & Video Title */}
            <View style={styles.inputRow}>
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
              <View style={styles.titleInputContainer}>
                <Text style={styles.fieldLabel}>CLIP TITLE / QUOTE</Text>
                <TextInput
                  style={styles.textInput}
                  value={quoteText}
                  onChangeText={setQuoteText}
                  placeholder="Quote or video context..."
                  placeholderTextColor={Colors.textMuted}
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
              numberOfLines={4}
            />

            {/* Emoji / Intent Selection */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>INTENT</Text>
            <View style={styles.emojiRow}>
              {EMOJI_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.emoji}
                  style={[
                    styles.emojiBtn,
                    selectedEmoji === item.emoji && styles.emojiBtnSelected,
                  ]}
                  onPress={() => setSelectedEmoji(item.emoji)}
                >
                  <Text style={styles.emojiIcon}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.emojiLabel,
                      selectedEmoji === item.emoji && styles.emojiLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fact Check Toggle */}
            <TouchableOpacity
              style={styles.factCheckToggle}
              onPress={() => setShowFactCheck(!showFactCheck)}
            >
              <Text style={styles.factCheckToggleText}>
                {showFactCheck ? '▼ Remove Fact-Check Context' : '+ Add AI / Consensus Fact-Check'}
              </Text>
            </TouchableOpacity>

            {/* Optional Fact Check Box */}
            {showFactCheck && (
              <View style={styles.factCheckContainer}>
                <Text style={styles.fieldLabel}>VERDICT</Text>
                <View style={styles.verdictRow}>
                  <TouchableOpacity
                    style={[
                      styles.verdictBtn,
                      factCheckVerdict === 'VERIFIED' && { borderColor: Colors.verified, backgroundColor: '#052e16' },
                    ]}
                    onPress={() => setFactCheckVerdict('VERIFIED')}
                  >
                    <Text style={{ color: Colors.verified, fontWeight: '700', fontSize: 11 }}>VERIFIED</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.verdictBtn,
                      factCheckVerdict === 'CONTEXT_NEEDED' && { borderColor: Colors.contextNeeded, backgroundColor: '#451a03' },
                    ]}
                    onPress={() => setFactCheckVerdict('CONTEXT_NEEDED')}
                  >
                    <Text style={{ color: Colors.contextNeeded, fontWeight: '700', fontSize: 11 }}>CONTEXT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.verdictBtn,
                      factCheckVerdict === 'FALSE' && { borderColor: Colors.falseClaim, backgroundColor: '#450a0a' },
                    ]}
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

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitBtnText}>PUBLISH TO NETWORK 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderColor: Colors.border,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontWeight: '900',
    letterSpacing: 1,
  },
  platformBadge: {
    backgroundColor: '#0F2840',
    borderColor: Colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformBadgeText: {
    color: Colors.cyan,
    fontSize: 9,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    padding: 20,
  },
  urlBox: {
    backgroundColor: Colors.surfaceElevated,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.cyan,
    marginBottom: 12,
  },
  urlLabel: {
    color: Colors.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  urlText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeInputContainer: {
    width: 80,
  },
  titleInputContainer: {
    flex: 1,
  },
  fieldLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  timeInput: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: Colors.cyan,
    fontSize: 14,
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
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  emojiBtnSelected: {
    borderColor: Colors.cyan,
    backgroundColor: '#0F2840',
  },
  emojiIcon: {
    fontSize: 14,
  },
  emojiLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  emojiLabelSelected: {
    color: Colors.cyan,
  },
  factCheckToggle: {
    paddingVertical: 12,
    marginTop: 8,
  },
  factCheckToggleText: {
    color: Colors.cyan,
    fontSize: 13,
    fontWeight: '700',
  },
  factCheckContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  verdictRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verdictBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionRow: {
    marginVertical: 20,
    marginBottom: 40,
  },
  submitBtn: {
    backgroundColor: Colors.cyan,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
