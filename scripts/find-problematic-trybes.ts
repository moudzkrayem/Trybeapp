/**
 * Audit and cleanup script for Trybe documents in Firestore.
 * Identifies docs with missing fields (dateTime, hostId, tags, attendeeIds, price, etc.)
 * and logs details for remediation.
 *
 * Usage:
 * npx tsx scripts/find-problematic-trybes.ts
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const REQUIRED_FIELDS = [
  'id',
  'name', // or title
  'category',
  'description',
  'location',
  'dateTime', // or startTime
  'hostId', // or organizerId
  'tags',
  'price',
  'attendeesCount', // or rsvpCount
  'attendeeIds',
  'imageUrl', // or eventPictureUrl
  'isPromoted',
];

interface ProblemDoc {
  id: string;
  collection: string;
  missingFields: string[];
  issues: string[];
}

export async function auditTrybes(shouldAutoFix = false) {
  console.log("🔍 Scanning Firestore for problematic trybe/event documents...");
  const collectionsToAudit = ['trybes', 'events'];
  const problematic: ProblemDoc[] = [];

  for (const colName of collectionsToAudit) {
    try {
      const colRef = collection(firestore, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Auditing collection '${colName}': found ${snapshot.size} documents.`);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const docId = docSnap.id;
        const missing: string[] = [];
        const issues: string[] = [];

        // Check name / title
        if (!data.name && !data.title) {
          missing.push('name/title');
        }

        // Check category
        if (!data.category) {
          missing.push('category');
        }

        // Check description
        if (data.description === undefined) {
          missing.push('description');
        }

        // Check location
        if (!data.location) {
          missing.push('location');
        }

        // Check dateTime / startTime
        const rawDate = data.dateTime || data.startTime;
        if (!rawDate) {
          missing.push('dateTime/startTime');
        } else if (typeof rawDate === 'object' && typeof rawDate.toDate !== 'function' && typeof rawDate.seconds !== 'number') {
          issues.push('Invalid dateTime object structure');
        }

        // Check hostId / organizerId
        if (!data.hostId && !data.organizerId) {
          missing.push('hostId/organizerId');
        }

        // Check host info
        if (!data.host || !data.host.name) {
          if (!data.hostName && !data.organizerName) {
            issues.push('Missing host.name or organizerName');
          }
        }

        // Check tags
        if (!data.tags || !Array.isArray(data.tags)) {
          missing.push('tags (must be array)');
        }

        // Check price
        if (typeof data.price !== 'number') {
          missing.push('price (must be number)');
        }

        // Check attendees
        if (typeof data.attendeesCount !== 'number' && typeof data.rsvpCount !== 'number') {
          missing.push('attendeesCount/rsvpCount');
        }
        if (!Array.isArray(data.attendeeIds)) {
          missing.push('attendeeIds (must be array)');
        }

        // Check image
        if (!data.imageUrl && !data.eventPictureUrl) {
          missing.push('imageUrl/eventPictureUrl');
        }

        if (missing.length > 0 || issues.length > 0) {
          problematic.push({
            id: docId,
            collection: colName,
            missingFields: missing,
            issues: issues,
          });

          if (shouldAutoFix) {
            console.log(`🛠️ Auto-fixing document ${docId} in ${colName}...`);
            const normalizedDate = rawDate ? (typeof rawDate === 'string' ? rawDate : new Date().toISOString()) : new Date().toISOString();
            const updates: Record<string, any> = {
              name: data.name || data.title || 'Community Trybe',
              title: data.title || data.name || 'Community Trybe',
              category: data.category || 'social-networking',
              description: data.description || '',
              location: typeof data.location === 'string' ? data.location : 'Local Venue',
              dateTime: normalizedDate,
              startTime: data.startTime || normalizedDate,
              endTime: data.endTime || normalizedDate,
              hostId: data.hostId || data.organizerId || 'system',
              organizerId: data.organizerId || data.hostId || 'system',
              host: {
                name: data.host?.name || data.hostName || data.organizerName || 'Trybe Host',
                avatarUrl: data.host?.avatarUrl || data.hostAvatarUrl || data.organizerPhoto || '',
              },
              tags: Array.isArray(data.tags) ? data.tags : [],
              price: typeof data.price === 'number' ? data.price : 0,
              attendeesCount: typeof data.attendeesCount === 'number' ? data.attendeesCount : (data.rsvpCount || 0),
              rsvpCount: typeof data.rsvpCount === 'number' ? data.rsvpCount : (data.attendeesCount || 0),
              attendeeIds: Array.isArray(data.attendeeIds) ? data.attendeeIds : [],
              imageUrl: data.imageUrl || data.eventPictureUrl || 'https://picsum.photos/seed/event/800/600',
              eventPictureUrl: data.eventPictureUrl || data.imageUrl || 'https://picsum.photos/seed/event/800/600',
              isPromoted: Boolean(data.isPromoted),
            };

            await updateDoc(doc(firestore, colName, docId), updates);
            console.log(`✅ Fixed document ${docId}`);
          }
        }
      }
    } catch (e: any) {
      console.warn(`Could not read collection ${colName}:`, e.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Audit Complete: Found ${problematic.length} problematic documents.`);
  console.log(`========================================`);

  for (const item of problematic) {
    console.log(`\n[${item.collection}] Doc ID: ${item.id}`);
    if (item.missingFields.length > 0) {
      console.log(`  Missing: ${item.missingFields.join(', ')}`);
    }
    if (item.issues.length > 0) {
      console.log(`  Issues: ${item.issues.join(', ')}`);
    }
  }

  return problematic;
}

if (require.main === module) {
  auditTrybes(process.argv.includes('--fix')).catch(console.error);
}
