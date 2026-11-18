import React, { useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface ParentOnboardingFormData {
  email: string;
  password: string;
  passwordVerify: string;
}

export interface ParentOnboardingProps {
  onSubmit: (data: ParentOnboardingFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function ParentOnboarding({
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: ParentOnboardingProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVerify, setPasswordVerify] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const verifyRef = useRef<TextInput>(null);
  const underlineEmail = useRef(new Animated.Value(0)).current;
  const underlinePassword = useRef(new Animated.Value(0)).current;
  const underlineVerify = useRef(new Animated.Value(0)).current;

  const handleEmailChange = (text: string) => {
    setEmail(text);
    Animated.timing(underlineEmail, {
      toValue: text.length > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    Animated.timing(underlinePassword, {
      toValue: text.length > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleVerifyChange = (text: string) => {
    setPasswordVerify(text);
    Animated.timing(underlineVerify, {
      toValue: text.length > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const isValid =
    email.trim().length > 0 &&
    password.length >= 8 &&
    passwordVerify === password &&
    !submitting &&
    !isLoading;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      await onSubmit({
        email: email.trim(),
        password,
        passwordVerify,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const underlineColorEmail = underlineEmail.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff14', '#a7f3d0'],
  });

  const underlineColorPassword = underlinePassword.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff14', '#a7f3d0'],
  });

  const underlineColorVerify = underlineVerify.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff14', '#a7f3d0'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#071410', '#0d1f18', '#08140f']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.step}>PARENT ONBOARDING</Text>
        <Text style={styles.title}>Create your account.</Text>
        <Text style={styles.intro}>
          Set up your email and password to begin your guardian journey.
        </Text>

        <Text style={styles.label}>Email address</Text>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => emailRef.current?.focus()}
          style={styles.inputWrap}
        >
          <TextInput
            ref={emailRef}
            value={email}
            onChangeText={handleEmailChange}
            placeholder="guardian@example.com"
            placeholderTextColor="#3d5e4a"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!isLoading && !submitting}
            accessibilityLabel="Email address"
          />
          <Animated.View
            style={[styles.inputUnderline, { backgroundColor: underlineColorEmail }]}
          />
        </TouchableOpacity>

        <Text style={[styles.label, styles.labelSpaced]}>Password</Text>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => passwordRef.current?.focus()}
          style={styles.inputWrap}
        >
          <TextInput
            ref={passwordRef}
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="min. 8 characters"
            placeholderTextColor="#3d5e4a"
            style={styles.input}
            secureTextEntry={!showPassword}
            returnKeyType="next"
            onSubmitEditing={() => verifyRef.current?.focus()}
            editable={!isLoading && !submitting}
            accessibilityLabel="Password"
          />
          <Animated.View
            style={[styles.inputUnderline, { backgroundColor: underlineColorPassword }]}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.togglePassword}
          accessible
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Text style={styles.toggleText}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, styles.labelSpaced]}>Verify password</Text>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => verifyRef.current?.focus()}
          style={styles.inputWrap}
        >
          <TextInput
            ref={verifyRef}
            value={passwordVerify}
            onChangeText={handleVerifyChange}
            placeholder="Re-enter your password"
            placeholderTextColor="#3d5e4a"
            style={styles.input}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isLoading && !submitting}
            accessibilityLabel="Verify password"
          />
          <Animated.View
            style={[styles.inputUnderline, { backgroundColor: underlineColorVerify }]}
          />
        </TouchableOpacity>

        {passwordVerify.length > 0 && password !== passwordVerify && (
          <Text style={styles.error} accessibilityRole="alert">
            Passwords do not match
          </Text>
        )}

        {password.length > 0 && password.length < 8 && (
          <Text style={styles.hint}>
            Password must be at least 8 characters
          </Text>
        )}

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={!isValid}
          onPress={handleSubmit}
          style={[styles.btn, !isValid && styles.btnDisabled]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.btnText}>
            {submitting || isLoading ? 'Creating account…' : 'Create Account →'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08140f' },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  back: { marginBottom: 28 },
  backText: { color: '#789082', fontSize: 22 },
  step: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: 12,
  },
  intro: { color: '#8aaf9c', fontSize: 13, lineHeight: 20, marginBottom: 32 },
  label: {
    color: '#8aaf9c',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },
  labelSpaced: { marginTop: 24 },
  hint: { color: '#3d5e4a', fontSize: 11, lineHeight: 16, marginTop: 10 },
  inputWrap: { marginBottom: 12, paddingBottom: 8 },
  input: { color: '#fff', fontSize: 16, fontWeight: '500', paddingBottom: 8 },
  inputUnderline: {
    height: 2,
    borderRadius: 1,
  },
  togglePassword: { marginBottom: 24, paddingHorizontal: 2 },
  toggleText: { color: '#6ee7b7', fontSize: 12, fontWeight: '600' },
  error: {
    color: '#ff6b6b',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  footer: { paddingHorizontal: 28, paddingBottom: 24 },
  btn: {
    backgroundColor: '#6ee7b7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#08140f', fontSize: 16, fontWeight: '700' },
});
