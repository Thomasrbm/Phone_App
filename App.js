import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, 
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform 
} from 'react-native';

export default function App() {
  const [goal, setGoal] = useState('');

  const handleAddGoal = () => {
    if (goal.length > 0) {
      alert(`Objectif enregistré : ${goal}`);
      setGoal(''); // On vide le champ
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Jarvis 2026</Text>
          <Text style={styles.welcome}>Nouvel Objectif</Text>
          
          <TextInput 
            style={styles.input}
            placeholder="Ex: Courir 5km, Apprendre le Japonais..."
            value={goal}
            onChangeText={setGoal}
          />

          <TouchableOpacity style={styles.button} onPress={handleAddGoal}>
            <Text style={styles.buttonText}>Ajouter l'objectif</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    width: '100%',
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1c1c1e',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f1f1f4',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1c1c1e',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});