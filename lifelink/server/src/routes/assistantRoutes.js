const express = require('express');
const router = express.Router();
const RequestService = require('../services/requestService');

const KNOWLEDGE_BASE = {
  en: {
    eligibility: "Generally, donors should be 18–65 years old, weigh at least 50 kg, have normal hemoglobin levels (≥ 12.5 g/dL), and have waited at least 90 days since their last whole blood donation. Final medical eligibility is determined in person by healthcare personnel at the authorized donation center.",
    how_to_request: "Anyone can submit a public emergency request directly from the Public Portal without logging in. You need patient reference, hospital name, blood group, units needed, and requester phone. Authorized hospital clinicians can also sign in to the Hospital Portal for immediate bedside request dispatch.",
    tracking: "You can track any emergency request live using its unique Reference ID (e.g. REQ-2026-XXXX) and your 6-digit access PIN or phone number on the Track Request view. It shows the 9-stage progression from triage review to donor outreach and unit delivery.",
    donor_response: "When a donor receives an emergency match, they can click 'I Can Help' to confirm willingness and provide an estimated arrival time (ETA), or 'Unable to Donate' to decline. If an accepted donor later cannot attend, they can click 'Withdraw Response' to reopen the candidate pool.",
    certificates: "BloodLink issues tamper-evident Digital Donation Certificates with SHA-256 ledgers and QR verification. Certificates are only generated after an authorized hospital records a completed physical donation, never on mere willingness.",
    quiet_hours: "Standard non-critical donor notifications are paused during Quiet Hours (10:00 PM to 6:00 AM IST) to prevent notification fatigue. However, Critical Emergency requests (&lt; 2 hrs window) override quiet hours with sound alerts.",
    emergency_108: "For acute, life-threatening medical trauma or immediate cardiac/respiratory emergencies, immediately call 108 or your local emergency medical service before coordinating blood supply.",
    volunteer_scope: "BloodLink volunteers assist with civilian logistics, community outreach, and cold-chain transport support. Volunteers do not replace certified ambulance or emergency medical services.",
    privacy: "BloodLink protects your privacy by design. Exact GPS coordinates and private phone numbers are never displayed on public pages or to unverified users.",
    disclaimer: "I am an automated guidance assistant for the BloodLink platform. I do not provide medical diagnosis, treatment advice, clinical compatibility decisions, or live facility inventory guarantees."
  },
  te: {
    eligibility: "సాధారణంగా దాతలు 18–65 సంవత్సరాల వయస్సు, కనీసం 50 కిలోల బరువు మరియు సాధారణ హిమోగ్లోబిన్ (≥ 12.5 g/dL) కలిగి ఉండాలి. మునుపటి రక్తదానం తర్వాత కనీసం 90 రోజుల విరామం ఉండాలి. వైద్యపరమైన అర్హతను అధీకృత రక్త కేంద్రంలో ఆరోగ్య సిబ్బంది స్వయంగా నిర్ధారిస్తారు.",
    how_to_request: "ఎవరైనా లాగిన్ అవసరం లేకుండా పబ్లిక్ పోర్టల్ నుండి నేరుగా అత్యవసర రక్త అభ్యర్థనను సమర్పించవచ్చు. ఆసుపత్రి సిబ్బంది కూడా హాస్పిటల్ పోర్టల్ ద్వారా అభ్యర్థనలను నమోదు చేయవచ్చు.",
    tracking: "మీరు మీ రిఫరెన్స్ ID (ఉదా. REQ-2026-XXXX) మరియు 6-అంకెల పిన్‌తో అభ్యర్థన స్థితిని నిజ సమయంలో ట్రాక్ చేయవచ్చు.",
    donor_response: "దాతలు అత్యవసర పిలుపు వచ్చినప్పుడు 'I Can Help' అని క్లిక్ చేయవచ్చు, లేదా కుదరకపోతే 'Withdraw Response' ద్వారా ఉపసంహరించుకోవచ్చు.",
    certificates: "రక్తదానం పూర్తయిన తర్వాత మాత్రమే డిజిటల్ ధృవీకరణ పత్రం (సర్టిఫికెట్) జారీ చేయబడుతుంది.",
    quiet_hours: "రాత్రి 10 గంటల నుండి ఉదయం 6 గంటల వరకు సాధారణ నోటిఫికేషన్‌లు నిలిపివేయబడతాయి, అయితే అత్యవసర అభ్యర్థనలు వెంటనే పంపబడతాయి.",
    emergency_108: "తీవ్రమైన అత్యవసర పరిస్థితుల్లో వెంటనే 108 అంబులెన్స్ సేవలకు కాల్ చేయండి.",
    volunteer_scope: "బ్లడ్‌లింక్ వాలంటీర్లు సహాయక లాజిస్టిక్స్ మరియు రవాణా మద్దతు అందిస్తారు. వారు అంబులెన్స్ లేదా అత్యవసర క్లినికల్ సేవల స్థానంలో పనిచేయరు.",
    privacy: "బ్లడ్‌లింక్ మీ వ్యక్తిగత సమాచారాన్ని భద్రపరుస్తుంది. మీ ఖచ్చితమైన లొకేషన్ పబ్లిక్‌గా ఎప్పుడూ చూపబడదు.",
    disclaimer: "నేను బ్లడ్‌లింక్ సహాయక సహాయకుడిని. నేను వైద్య నిర్ధారణ, చికిత్స సలహా లేదా వైద్య అర్హతను నిర్ణయించలేను."
  },
  hi: {
    eligibility: "आमतौर पर रक्तदाता की आयु 18-65 वर्ष, वजन न्यूनतम 50 किलोग्राम होना चाहिए और हीमोग्लोबिन स्तर सामान्य (≥ 12.5 g/dL) होना चाहिए। अंतिम चिकित्सकीय योग्यता अधिकृत स्वास्थ्य कर्मियों द्वारा निर्धारित की जाती है।",
    how_to_request: "कोई भी व्यक्ति बिना लॉगिन किए पब्लिक पोर्टल से आपातकालीन रक्त अनुरोध प्रस्तुत कर सकता है। अस्पताल के कर्मचारी अपने पोर्टल से भी अनुरोध कर सकते हैं।",
    tracking: "आप अपने संदर्भ संख्या (Reference ID) और 6-अंकीय पिन के साथ लाइव ट्रैकिंग कर सकते हैं।",
    donor_response: "रक्तदाता 'I Can Help' पर क्लिक करके सहमति दे सकते हैं, या आवश्यक होने पर 'Withdraw Response' द्वारा अपनी प्रतिक्रिया वापस ले सकते हैं।",
    certificates: "सफल रक्तदान पूरा होने के बाद ही डिजिटल प्रमाणपत्र जारी किया जाता है।",
    quiet_hours: "रात 10 बजे से सुबह 6 बजे तक सामान्य सूचनाएं शांत रहती हैं, लेकिन गंभीर आपातकालीन अनुरोधों के लिए अलर्ट तुरंत भेजे जाते हैं।",
    emergency_108: "गंभीर आपातकालीन स्थिति में तुरंत 108 एम्बुलेंस सेवा को कॉल करें।",
    volunteer_scope: "ब्लडलिंक स्वयंसेवक केवल लॉजिस्टिक्स और समन्वय में सहायता करते हैं। वे आपातकालीन एम्बुलेंस या नैदानिक परिवहन का विकल्प नहीं हैं।",
    privacy: "ब्लडलिंक आपकी गोपनीयता की रक्षा करता है। आपके सटीक निर्देशांक कभी भी सार्वजनिक रूप से प्रदर्शित नहीं किए जाते हैं।",
    disclaimer: "मैं ब्लडलिंक का डिजिटल सहायक हूँ। मैं कोई चिकित्सकीय सलाह, निदान या रक्त घटक संगतता का निर्णय नहीं देता।"
  }
};

router.post('/query', (req, res) => {
  const { query = '', language = 'en' } = req.body;
  const lang = ['en', 'te', 'hi'].includes(language) ? language : 'en';
  const kb = KNOWLEDGE_BASE[lang];

  const lower = query.toLowerCase();

  // Safety trigger for medical diagnosis or prescription queries (FR-LNG-003 / Section 12)
  if (lower.includes('diagnos') || lower.includes('disease') || lower.includes('medicine') || lower.includes('treatment') || lower.includes('symptom') || lower.includes('prescri')) {
    return res.json({
      language: lang,
      answer: lang === 'te'
        ? "క్షమించండి, బ్లడ్‌లింక్ అసిస్టెంట్ వైద్య రోగ నిర్ధారణ లేదా చికిత్స సలహాను అందించదు. తీవ్రమైన అత్యవసర పరిస్థితుల్లో వెంటనే 108 లేదా అర్హత కలిగిన వైద్యుడిని సంప్రదించండి."
        : lang === 'hi'
        ? "क्षमा करें, ब्लडलिंक सहायक चिकित्सा निदान या उपचार सलाह प्रदान नहीं करता है। आपातकालीन स्थिति में तुरंत 108 पर कॉल करें या डॉक्टर से संपर्क करें।"
        : "I cannot provide medical diagnosis, treatment advice, or prescriptions. BloodLink is an emergency blood logistics coordination platform. For acute, life-threatening medical situations, call 108 immediately or consult a certified physician.",
      is_clinical_fallback: true
    });
  }

  // Live Database Reference Lookup (Section 12.3)
  const reqMatch = query.match(/(REQ-2026-\d{3,6}|REQ-[A-Z0-9-]+)/i);
  if (reqMatch) {
    try {
      const refId = reqMatch[0].toUpperCase();
      const tracking = RequestService.trackPublicRequest(refId);
      if (tracking && tracking.found) {
        const liveStatusText = `📋 Live Record for Reference ${tracking.reference_id}:
• Status: ${tracking.display_status || tracking.status}
• Medical Facility: ${tracking.hospital_name || 'Regional Hospital'}
• Blood Component: ${tracking.blood_group} ${tracking.blood_component || ''} (${tracking.units_requested} Units Requested, ${tracking.units_fulfilled} Fulfilled)
• Candidate Donors Alerted: ${tracking.matched_donors_contacted || 0}
• Confirmed Donor Responses: ${tracking.donor_willingness_responses || 0}
• Current Stage: ${tracking.public_safe_summary}
(You can track real-time progression in the Track Request dialog using your Reference ID and PIN).`;

        return res.json({
          language: lang,
          answer: liveStatusText,
          disclaimer: kb.disclaimer,
          reference_found: true,
          reference_id: tracking.reference_id
        });
      }
    } catch (_) {}
  }

  let answer = kb.disclaimer;
  if (lower.includes('eligib') || lower.includes('who can donate') || lower.includes('అర్హత') || lower.includes('योग्यता')) {
    answer = kb.eligibility;
  } else if (lower.includes('track') || lower.includes('pin') || lower.includes('status') || lower.includes('ట్రాక్') || lower.includes('स्थिति')) {
    answer = kb.tracking;
  } else if (lower.includes('certif') || lower.includes('ledger') || lower.includes('సర్టిఫికేట్') || lower.includes('प्रमाणपत्र')) {
    answer = kb.certificates;
  } else if (lower.includes('withdraw') || lower.includes('i can help') || lower.includes('accept') || lower.includes('ఉపసంహర') || lower.includes('सहमति')) {
    answer = kb.donor_response;
  } else if (lower.includes('quiet') || lower.includes('night') || lower.includes('రాంత్రి') || lower.includes('शांत घंटे')) {
    answer = kb.quiet_hours;
  } else if (lower.includes('108') || lower.includes('ambulance') || lower.includes('acute') || lower.includes('అంబులెన్స్')) {
    answer = kb.emergency_108;
  } else if (lower.includes('request') || lower.includes('hospital') || lower.includes('అభ్యర్థన') || lower.includes('अनुरोध')) {
    answer = kb.how_to_request;
  } else if (lower.includes('volunteer') || lower.includes('transport') || lower.includes('వాలంటీర్') || lower.includes('स्वयंसेवक')) {
    answer = kb.volunteer_scope;
  } else if (lower.includes('privacy') || lower.includes('location') || lower.includes('గోప్యత') || lower.includes('गोपनीयता')) {
    answer = kb.privacy;
  }

  res.json({
    language: lang,
    answer,
    disclaimer: kb.disclaimer
  });
});

module.exports = router;
