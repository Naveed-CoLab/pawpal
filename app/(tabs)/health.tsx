import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ApiConfig, validateGeminiApiKey } from '@/constants/apiConfig';
import { HEALTH_ANALYSIS_SYSTEM_PROMPT } from '@/constants/prompts';
import { useAuth } from '@/hooks/useAuth';
import { useSymptomAssessments } from '@/hooks/useDatabase';
import { Heart, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, Thermometer, Activity, MapPin, Phone, Bell, Save, Search, Navigation } from 'lucide-react-native';
import { router } from 'expo-router';

interface Symptom {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  selected: boolean;
}

interface AIAssessment {
  urgencyLevel: 'mild' | 'moderate' | 'emergency';
  symptomSummary: string[];
  analysis: string;
  immediateActions: string[];
  warnings: string[];
  vetRecommendation: string;
  possibleCauses: string[];
  color: string;
  icon: string;
}

const emergencySymptoms: Symptom[] = [
  { id: '1', name: 'Vomiting + Lethargy', severity: 'high', category: 'gastrointestinal', description: 'Repeated vomiting with weakness', selected: false },
  { id: '2', name: 'Difficulty Breathing', severity: 'high', category: 'respiratory', description: 'Labored or rapid breathing', selected: false },
  { id: '3', name: 'Seizures', severity: 'high', category: 'neurological', description: 'Convulsions or uncontrolled movements', selected: false },
  { id: '4', name: 'Bloated Abdomen', severity: 'high', category: 'gastrointestinal', description: 'Swollen, hard stomach area', selected: false },
  { id: '5', name: 'Pale/Blue Gums', severity: 'high', category: 'circulatory', description: 'Gums appear white, pale pink, or blue', selected: false },
  { id: '6', name: 'Collapse/Fainting', severity: 'high', category: 'circulatory', description: 'Sudden loss of consciousness', selected: false },
  { id: '7', name: 'Bleeding (Non-stop)', severity: 'high', category: 'injury', description: 'Continuous bleeding that won\'t stop', selected: false },
  { id: '8', name: 'Limping/Can\'t Walk', severity: 'medium', category: 'mobility', description: 'Sudden inability to walk normally', selected: false },
  { id: '9', name: 'Constant Crying/Yelping', severity: 'medium', category: 'pain', description: 'Continuous vocalizations of pain', selected: false },
  { id: '10', name: 'Not Eating/Drinking 24+ hrs', severity: 'medium', category: 'appetite', description: 'Complete loss of appetite and thirst', selected: false },
  { id: '11', name: 'Inability to Urinate', severity: 'high', category: 'urinary', description: 'Straining but cannot urinate', selected: false },
  { id: '12', name: 'Heatstroke Signs', severity: 'high', category: 'environmental', description: 'Heavy panting, drooling, collapse in heat', selected: false },
  { id: '13', name: 'Diarrhea', severity: 'low', category: 'gastrointestinal', description: 'Loose or watery stools', selected: false },
  { id: '14', name: 'Excessive Drooling', severity: 'low', category: 'oral', description: 'More saliva than usual', selected: false },
  { id: '15', name: 'Loss of Appetite', severity: 'low', category: 'appetite', description: 'Reduced interest in food', selected: false },
  { id: '16', name: 'Lethargy', severity: 'medium', category: 'behavioral', description: 'Unusual tiredness or low energy', selected: false },
  { id: '17', name: 'Excessive Panting', severity: 'medium', category: 'respiratory', description: 'Heavy breathing without exercise', selected: false },
  { id: '18', name: 'Vomiting', severity: 'medium', category: 'gastrointestinal', description: 'Throwing up food or liquid', selected: false },
];

export default function HealthScreen() {
  const { user } = useAuth();
  const { createAssessment, assessments } = useSymptomAssessments();
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>(emergencySymptoms);
  const [aiAssessment, setAiAssessment] = useState<AIAssessment | null>(null);
  const [userLocation, setUserLocation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev =>
      prev.map(symptom =>
        symptom.id === id
          ? { ...symptom, selected: !symptom.selected }
          : symptom
      )
    );
    setAiAssessment(null);
  };

  const callGeminiAPI = async (symptoms: string[]): Promise<AIAssessment> => {
    console.log('🤖 Health: Starting Gemini API call for symptom analysis');
    
    // Check if API key is properly configured
    if (!ApiConfig.GEMINI.API_KEY || ApiConfig.GEMINI.API_KEY === '' || !validateGeminiApiKey(ApiConfig.GEMINI.API_KEY)) {
      console.log('🔄 Health: Using fallback analysis - API key not configured or invalid');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      return getFallbackAssessment(symptoms);
    }

    // If fallback is enabled, use fallback responses
    if (ApiConfig.GEMINI.USE_FALLBACK_RESPONSES) {
      console.log('🔄 Health: Using fallback analysis');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      return getFallbackAssessment(symptoms);
    }
    
    const symptomPrompt = `
    ${HEALTH_ANALYSIS_SYSTEM_PROMPT}
    
    CLINICAL CASE PRESENTATION:
    Patient: Canine
    Chief Complaints: ${symptoms.join(', ')}
    Owner Location: ${userLocation || 'Not specified'}
    
    Please provide a comprehensive veterinary assessment in this EXACT JSON format:
    {
      "urgencyLevel": "mild|moderate|emergency",
      "symptomSummary": ["${symptoms.join('", "')}"],
      "analysis": "Detailed clinical analysis explaining the pathophysiology and significance of this specific symptom combination. Discuss differential diagnoses and explain why these symptoms together are concerning. Be specific to these exact symptoms.",
      "immediateActions": ["Specific action 1 based on symptoms", "Specific action 2 for this combination", "Specific monitoring instruction"],
      "warnings": ["Specific red flag for this condition", "Specific complication to watch for"],
      "vetRecommendation": "Precise timeline recommendation with medical justification",
      "possibleCauses": ["Most likely differential diagnosis", "Secondary differential", "Less likely but possible cause"],
      "color": "#color_code_based_on_urgency",
      "icon": "mild|moderate|emergency"
    }
    
    CLINICAL REQUIREMENTS:
    - Analyze this SPECIFIC symptom combination (${symptoms.join(' + ')})
    - Explain WHY these symptoms together are significant
    - Provide unique analysis - not generic responses
    - Include specific monitoring parameters for these symptoms
    - Give precise timeline based on clinical progression
    - Explain the pathophysiology behind your recommendations
    - Focus on differential diagnosis for this presentation
    
    URGENCY CLASSIFICATION:
    - emergency: Immediate life threat, 0-2 hours (#F44336)
    - moderate: Significant concern, 24-48 hours (#FF9800)  
    - mild: Monitoring appropriate, routine care (#4CAF50)
    
    Provide a professional veterinary consultation as if speaking to a concerned pet owner in your clinic.
    `;

    try {
      const response = await fetch(`${ApiConfig.GEMINI.API_URL}?key=${ApiConfig.GEMINI.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: symptomPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        // Read response as text for error logging
        const errorText = await response.text();
        console.error('❌ Health: HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // Only parse as JSON if response is ok
      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        try {
          // Clean the response by removing markdown code blocks
          let cleanedResponse = aiResponse.trim();
          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const parsedResponse = JSON.parse(cleanedResponse);
          return parsedResponse;
        } catch (parseError) {
          console.error('❌ Failed to parse AI response:', parseError);
          console.log('Raw AI response:', aiResponse);
          Alert.alert('Analysis Error', 'Failed to process the AI response. Please try again.');
          throw new Error('Failed to parse AI response');
        }
      } else {
        console.error('❌ Invalid response structure:', data);
        Alert.alert('Analysis Error', 'Received an invalid response from the AI. Please try again.');
        throw new Error('Invalid response structure from Gemini API');
      }
    } catch (error) {
      console.error('💥 Health: Gemini API Error:', error);
      Alert.alert('Analysis Error', 'Failed to analyze symptoms. Please try again later.');
      return getFallbackAssessment(symptoms);
    }
  };

  const getFallbackAssessment = (symptoms: string[]): AIAssessment => {
    // Professional veterinary assessment based on specific symptom combinations
    const getSpecificAnalysis = (symptomList: string[]) => {
      const symptomString = symptomList.join(', ').toLowerCase();
      
      // Emergency symptoms requiring immediate care
      if (symptomList.some(s => ['Seizures', 'Difficulty Breathing', 'Bloated Abdomen', 'Pale/Blue Gums', 'Collapse/Fainting', 'Bleeding (Non-stop)', 'Inability to Urinate', 'Heatstroke Signs'].includes(s))) {
        return {
          urgencyLevel: 'emergency' as const,
          analysis: `The combination of ${symptomList.join(' and ')} represents a potential veterinary emergency. These symptoms can indicate serious conditions such as gastric dilatation-volvulus (bloat), cardiovascular compromise, or neurological dysfunction. The presentation requires immediate clinical assessment to rule out life-threatening conditions.`,
          immediateActions: [
            'Transport to emergency veterinary hospital immediately',
            'Keep your pet calm and minimize movement during transport',
            'Do not offer food or water until evaluated by veterinarian',
            'Monitor respiratory rate and gum color during transport'
          ],
          warnings: [
            'These symptoms can progress rapidly to life-threatening complications',
            'Do not delay seeking immediate veterinary care',
            'Avoid inducing vomiting unless specifically directed by veterinarian'
          ],
          vetRecommendation: 'EMERGENCY: Seek immediate veterinary care within 0-2 hours. Contact your nearest emergency animal hospital.',
          possibleCauses: ['Gastric dilatation-volvulus', 'Cardiovascular emergency', 'Neurological dysfunction', 'Severe toxicity'],
          color: '#F44336'
        };
      }
      
      // Gastrointestinal concerns
      if (symptomString.includes('vomiting') && symptomString.includes('diarrhea')) {
        return {
          urgencyLevel: 'moderate' as const,
          analysis: `The concurrent presentation of vomiting and diarrhea indicates acute gastroenteritis. This combination can lead to rapid dehydration and electrolyte imbalances, particularly concerning in younger or senior dogs. The etiology may include dietary indiscretion, infectious agents, or systemic conditions.`,
          immediateActions: [
            'Withhold food for 12-24 hours to rest the gastrointestinal tract',
            'Provide small amounts of water frequently to prevent dehydration',
            'Monitor for signs of dehydration (dry gums, skin tenting)',
            'Document frequency and character of vomiting/diarrhea episodes'
          ],
          warnings: [
            'Watch for signs of dehydration or bloody discharge',
            'Seek immediate care if symptoms worsen or pet becomes lethargic',
            'Monitor for abdominal pain or distension'
          ],
          vetRecommendation: 'Schedule veterinary consultation within 24-48 hours. Seek immediate care if dehydration develops.',
          possibleCauses: ['Acute gastroenteritis', 'Dietary indiscretion', 'Parasitic infection', 'Inflammatory bowel condition'],
          color: '#FF9800'
        };
      }
      
      // Respiratory concerns
      if (symptomString.includes('panting') || symptomString.includes('breathing')) {
        return {
          urgencyLevel: 'moderate' as const,
          analysis: `Excessive panting or breathing changes can indicate respiratory distress, cardiovascular compromise, or thermoregulatory dysfunction. The persistence of these symptoms outside of normal exercise or warm weather contexts warrants clinical evaluation to assess pulmonary and cardiac function.`,
          immediateActions: [
            'Move pet to cool, well-ventilated environment',
            'Restrict exercise and excitement until evaluated',
            'Monitor respiratory rate at rest (normal: 10-30 breaths/minute)',
            'Observe gum color for cyanosis or pallor'
          ],
          warnings: [
            'Seek immediate care if gums become blue or white',
            'Watch for open-mouth breathing or distressed posturing',
            'Monitor for collapse or inability to lie down comfortably'
          ],
          vetRecommendation: 'Veterinary examination recommended within 24-48 hours. Immediate care if respiratory distress worsens.',
          possibleCauses: ['Heat stress', 'Cardiac condition', 'Respiratory infection', 'Anxiety or pain'],
          color: '#FF9800'
        };
      }
      
      // Appetite and behavioral changes
      if (symptomString.includes('appetite') || symptomString.includes('lethargy')) {
        return {
          urgencyLevel: 'mild' as const,
          analysis: `Loss of appetite combined with lethargy represents a non-specific but clinically significant presentation. While these symptoms can indicate various conditions ranging from minor to serious, the combination warrants veterinary assessment to rule out underlying systemic conditions, particularly if persistent beyond 24-48 hours.`,
          immediateActions: [
            'Monitor food and water intake closely',
            'Offer highly palatable foods in small portions',
            'Maintain regular routine to reduce stress',
            'Document duration and severity of symptoms'
          ],
          warnings: [
            'Seek immediate care if complete anorexia persists beyond 48 hours',
            'Monitor for additional symptoms such as vomiting or diarrhea',
            'Watch for signs of pain or discomfort'
          ],
          vetRecommendation: 'Schedule routine veterinary consultation within 3-5 days if symptoms persist. Earlier if worsening.',
          possibleCauses: ['Mild gastrointestinal upset', 'Stress response', 'Early systemic illness', 'Dental pain'],
          color: '#4CAF50'
        };
      }
      
      // Default moderate assessment for other combinations
      return {
        urgencyLevel: 'moderate' as const,
        analysis: `The symptom combination of ${symptomList.join(', ')} requires professional veterinary assessment. While not immediately life-threatening, these clinical signs can indicate developing conditions that benefit from early intervention and appropriate diagnostic evaluation.`,
        immediateActions: [
          'Monitor symptoms closely and document any changes',
          'Maintain normal feeding and watering schedules unless contraindicated',
          'Limit strenuous activity until veterinary assessment',
          'Prepare list of questions and observations for veterinary visit'
        ],
        warnings: [
          'Contact veterinarian immediately if symptoms worsen or new signs develop',
          'Do not administer human medications without veterinary guidance',
          'Monitor for signs of pain, distress, or behavioral changes'
        ],
        vetRecommendation: 'Schedule veterinary consultation within 24-48 hours for proper diagnostic evaluation.',
        possibleCauses: ['Inflammatory condition', 'Infectious process', 'Metabolic disorder', 'Behavioral or stress response'],
        color: '#FF9800'
      };
    };

    const analysis = getSpecificAnalysis(symptoms);
    
    return {
      ...analysis,
      symptomSummary: symptoms,
      icon: analysis.urgencyLevel
    };
  };

  const assessHealthWithAI = async () => {
    const selected = selectedSymptoms.filter(s => s.selected);
    
    if (selected.length === 0) {
      Alert.alert('No Symptoms', 'Please select at least one symptom to assess.');
      return;
    }

    setIsAnalyzing(true);
    const symptomNames = selected.map(s => s.name);
    
    try {
      const assessment = await callGeminiAPI(symptomNames);
      setAiAssessment(assessment);
    } catch (error) {
      console.error('Assessment error:', error);
      Alert.alert('Analysis Error', 'Failed to analyze symptoms. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAssessment = () => {
    setSelectedSymptoms(emergencySymptoms.map(s => ({ ...s, selected: false })));
    setAiAssessment(null);
  };

  const saveCase = async () => {
    if (!aiAssessment || !user) {
      Alert.alert('Error', 'Unable to save case. Please ensure you are logged in.');
      return;
    }

    setIsSaving(true);
    
    try {
      const selected = selectedSymptoms.filter(s => s.selected);
      
      const assessmentData = {
        symptoms_selected: aiAssessment.symptomSummary,
        urgency_level: aiAssessment.urgencyLevel,
        ai_analysis: aiAssessment.analysis,
        immediate_actions: aiAssessment.immediateActions,
        warnings: aiAssessment.warnings,
        vet_recommendation: aiAssessment.vetRecommendation,
        possible_causes: aiAssessment.possibleCauses,
        user_location: userLocation || undefined,
        assessment_data: aiAssessment // Store the full AI response
      };

      const { data, error } = await createAssessment(assessmentData);
      
      if (error) {
        console.error('Failed to save assessment:', error);
        Alert.alert('Save Failed', 'Failed to save the assessment. Please try again.');
      } else {
        console.log('✅ Assessment saved successfully:', data);
        Alert.alert(
          'Case Saved! 💾', 
          `Your symptom assessment has been saved to your medical history.\n\nTotal assessments: ${assessments.length + 1}`,
          [
            { text: 'View History', onPress: () => router.replace('/(tabs)/history') },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const findNearbyVets = () => {
    const query = userLocation 
      ? `veterinary emergency clinic near ${userLocation}`
      : 'veterinary emergency clinic near me';
    
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    Linking.openURL(url);
  };

  const callEmergencyVet = () => {
    Alert.alert(
      'Emergency Veterinary Help',
      'Choose an option:',
      [
        { text: 'Call Local Emergency Vet', onPress: () => Linking.openURL('tel:') },
        { text: 'Pet Poison Helpline', onPress: () => Linking.openURL('tel:8557647661') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return Colors.error;
      case 'medium': return Colors.warning;
      case 'low': return Colors.success;
      default: return Colors.primary;
    }
  };

  const getAssessmentIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle size={24} color={Colors.error} />;
      case 'medium': return <Clock size={24} color={Colors.warning} />;
      case 'low': return <CheckCircle size={24} color={Colors.success} />;
      default: return <Heart size={24} color={Colors.primary} />;
    }
  };

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Heart size={32} color={Colors.primary} />
          <Text style={styles.headerTitle}>Emergency Symptom Checker</Text>
          <Text style={styles.headerSubtitle}>
            Select symptoms and get AI-powered veterinary guidance
          </Text>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => {
              Alert.alert(
                'Assessment History',
                'Please tap on the History tab at the bottom of the screen to view your past assessments.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Clock size={16} color={Colors.primary} />
            <Text style={styles.historyButtonText}>View Assessment History</Text>
          </TouchableOpacity>
        </View>

        {/* Location Search */}
        <Card variant="elevated" style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.locationTitle}>Your Location (Optional)</Text>
          </View>
          <View style={styles.locationInputContainer}>
            <TextInput
              style={styles.locationInput}
              value={userLocation}
              onChangeText={setUserLocation}
              placeholder="Enter city or zip code for nearby vets..."
              placeholderTextColor={Colors.disabled}
            />
            <TouchableOpacity style={styles.searchButton} onPress={findNearbyVets}>
              <Search size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </Card>

        <Card variant="elevated" style={styles.symptomsCard}>
          <Text style={styles.sectionTitle}>Current Symptoms</Text>
          <View style={styles.symptomsGrid}>
            {selectedSymptoms.map((symptom) => (
              <TouchableOpacity
                key={symptom.id}
                style={[
                  styles.symptomChip,
                  symptom.selected && styles.symptomChipSelected,
                  symptom.selected && {
                    backgroundColor: getSeverityColor(symptom.severity) + '20',
                    borderColor: getSeverityColor(symptom.severity),
                  }
                ]}
                onPress={() => toggleSymptom(symptom.id)}
              >
                <Text style={[
                  styles.symptomText,
                  symptom.selected && {
                    color: getSeverityColor(symptom.severity),
                    fontFamily: Fonts.body.bold,
                  }
                ]}>
                  {symptom.name}
                </Text>
                {symptom.severity === 'high' && (
                  <AlertTriangle size={12} color={Colors.error} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title={isAnalyzing ? "Analyzing..." : "AI Health Assessment"}
            onPress={assessHealthWithAI}
            style={styles.assessButton}
            disabled={isAnalyzing}
          />
          <Button
            title="Clear All"
            onPress={clearAssessment}
            variant="outline"
            style={styles.clearButton}
          />
        </View>

        {isAnalyzing && (
          <Card variant="elevated" style={styles.loadingCard}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>
                🤖 AI is analyzing symptoms...
              </Text>
              <Text style={styles.loadingSubtext}>
                Getting professional veterinary guidance
              </Text>
            </View>
          </Card>
        )}

        {aiAssessment && (
          <Card
            variant="elevated"
            style={[
              styles.assessmentCard,
              { borderLeftColor: aiAssessment.color }
            ]}
          >
            {/* Urgency Level Header */}
            <View style={styles.assessmentHeader}>
              <View style={[styles.urgencyIcon, { backgroundColor: aiAssessment.color }]}>
                {aiAssessment.urgencyLevel === 'emergency' && <AlertTriangle size={20} color={Colors.white} />}
                {aiAssessment.urgencyLevel === 'moderate' && <Clock size={20} color={Colors.white} />}
                {aiAssessment.urgencyLevel === 'mild' && <CheckCircle size={20} color={Colors.white} />}
              </View>
              <Text style={[
                styles.assessmentLevel,
                { color: aiAssessment.color }
              ]}>
                {aiAssessment.urgencyLevel.toUpperCase()} PRIORITY
              </Text>
            </View>

            {/* Symptom Summary */}
            <View style={styles.symptomSummaryContainer}>
              <Text style={styles.symptomSummaryTitle}>Symptoms Analyzed:</Text>
              <View style={styles.symptomTags}>
                {aiAssessment.symptomSummary.map((symptom, index) => (
                  <View key={index} style={[styles.symptomTag, { borderColor: aiAssessment.color }]}>
                    <Text style={[styles.symptomTagText, { color: aiAssessment.color }]}>{symptom}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* AI Analysis */}
            <Text style={styles.analysisTitle}>Professional Analysis:</Text>
            <Text style={styles.assessmentMessage}>{aiAssessment.analysis}</Text>

            {/* Immediate Actions */}
            <Text style={styles.actionsTitle}>Immediate Actions:</Text>
            {aiAssessment.immediateActions.map((action, index) => (
              <Text key={index} style={styles.actionItem}>• {action}</Text>
            ))}

            {/* Warnings */}
            {aiAssessment.warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                <Text style={styles.warningsTitle}>⚠️ Important Warnings:</Text>
                {aiAssessment.warnings.map((warning, index) => (
                  <Text key={index} style={styles.warningItem}>• {warning}</Text>
                ))}
              </View>
            )}

            {/* Vet Recommendation */}
            <View style={[styles.vetRecommendation, { backgroundColor: aiAssessment.color + '15' }]}>
              <Text style={styles.vetRecommendationTitle}>Veterinary Recommendation:</Text>
              <Text style={styles.vetRecommendationText}>{aiAssessment.vetRecommendation}</Text>
            </View>

            {/* Possible Causes */}
            <Text style={styles.causesTitle}>Possible Causes:</Text>
            <Text style={styles.causesText}>{aiAssessment.possibleCauses.join(', ')}</Text>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {aiAssessment.urgencyLevel === 'emergency' && (
                <Button
                  title="🚨 Call Emergency Vet"
                  onPress={callEmergencyVet}
                  style={[styles.emergencyButton, { backgroundColor: Colors.error }]}
                />
              )}
              <Button
                title="📍 Find Nearby Vets"
                onPress={findNearbyVets}
                variant="outline"
                style={styles.findVetsButton}
              />
              <Button
                title={isSaving ? "💾 Saving..." : "💾 Save Case"}
                onPress={saveCase}
                variant="outline"
                style={styles.saveCaseButton}
                disabled={isSaving}
              />
            </View>
          </Card>
        )}

        <Card variant="outlined" style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Activity size={20} color={Colors.primary} />
            <Text style={styles.infoTitle}>Health Monitoring Tips</Text>
          </View>
          <Text style={styles.infoText}>
            • Monitor your dog's eating and drinking habits daily{'\n'}
            • Check for changes in energy levels and behavior{'\n'}
            • Regular grooming helps spot skin issues early{'\n'}
            • Keep a health journal for vet visits{'\n'}
            • Schedule regular check-ups with your veterinarian
          </Text>
        </Card>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
  },
  symptomsCard: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: 16,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  symptomChipSelected: {
    borderWidth: 2,
  },
  symptomText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  assessButton: {
    flex: 2,
  },
  clearButton: {
    flex: 1,
  },
  assessmentCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  assessmentLevel: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    marginLeft: 8,
  },
  assessmentMessage: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginBottom: 8,
  },
  assessmentAction: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.8,
    lineHeight: 20,
  },
  emergencyInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
  },
  emergencyTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: Colors.error,
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.error,
    lineHeight: 16,
  },
  infoCard: {
    marginHorizontal: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.8,
    lineHeight: 20,
  },
  // Location Search Styles
  locationCard: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginLeft: 8,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Loading State Styles
  loadingCard: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    marginTop: 4,
  },
  // Enhanced Assessment Styles
  urgencyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  symptomSummaryContainer: {
    marginBottom: 16,
  },
  symptomSummaryTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  symptomTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  symptomTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  symptomTagText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
  },
  analysisTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  actionsTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  actionItem: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  warningsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.warning + '15',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  warningsTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: Colors.warning,
    marginBottom: 8,
  },
  warningItem: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.warning,
    lineHeight: 18,
    marginBottom: 4,
  },
  vetRecommendation: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vetRecommendationTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  vetRecommendationText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    lineHeight: 18,
  },
  causesTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  causesText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    marginTop: 20,
    gap: 8,
  },
  emergencyButton: {
    marginBottom: 8,
  },
  findVetsButton: {
    borderColor: Colors.primary,
  },
  saveCaseButton: {
    borderColor: Colors.accent,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 12,
  },
  historyButtonText: {
    fontFamily: Fonts.body.medium,
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 6,
  },
});