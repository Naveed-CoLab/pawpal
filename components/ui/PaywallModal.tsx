import React from 'react';
import { Platform } from 'react-native';
import RevenueCatPaywall from './RevenueCatPaywall';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  onPurchaseError?: (error: string) => void;
  onRestoreSuccess?: () => void;
  requiredEntitlement?: string;
}

export function PaywallModal({ 
  visible, 
  onClose, 
  onPurchaseSuccess,
  onPurchaseError,
  onRestoreSuccess,
  requiredEntitlement = 'premium'
}: PaywallModalProps) {
  // This component is now just a wrapper around RevenueCatPaywall
  // for backward compatibility
  return (
    <RevenueCatPaywall
      visible={visible}
      onDismiss={onClose}
      onPurchaseCompleted={(customerInfo) => {
        console.log('✅ Purchase completed:', customerInfo);
        onPurchaseSuccess?.();
      }}
      onRestoreCompleted={(customerInfo) => {
        console.log('✅ Restore completed:', customerInfo);
        onRestoreSuccess?.();
      }}
      requiredEntitlementIdentifier={requiredEntitlement}
    />
  );
}