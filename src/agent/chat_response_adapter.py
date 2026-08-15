from typing import Dict, Any, List, Optional


class ChatResponseAdapter:
    def __init__(self, backend_client=None):
        self.backend_client = backend_client

    def adapt(self, ai_response: Dict[str, Any], user_message: str) -> Dict[str, Any]:
        intent = ai_response.get("intent", "chitchat")
        response_text = ai_response.get("response_text", "")
        red_flags = ai_response.get("red_flags", [])
        entities = ai_response.get("extracted_entities", {})
        
        # Ambil suggested_questions dari LLM response (fallback ke generator jika kosong)
        suggested_questions = ai_response.get("suggested_questions", [])
        if not suggested_questions or not isinstance(suggested_questions, list):
            suggested_questions = self._generate_fallback_questions(intent, user_message, red_flags)
        else:
            # Filter & bersihkan
            suggested_questions = [
                q for q in suggested_questions 
                if isinstance(q, str) and q.strip()
            ][:3]
        
        needs_products = self._should_recommend_products(intent, user_message, entities)
        needs_doctor = self._should_recommend_doctor(intent, red_flags, user_message, entities)
        
        products = []
        doctor = None
        
        if needs_products and self.backend_client:
            products = self._get_relevant_products(intent, user_message, red_flags)
        
        if needs_doctor and self.backend_client:
            doctor = self._get_relevant_doctor(intent, red_flags, user_message, entities)
            if doctor:
                response_text = self._fix_response_text(response_text, doctor, user_message)
        
        return {
            "response_text": response_text,
            "products": products,
            "doctor": doctor,
            "red_flags": red_flags,
            "intent": intent,
            "entities": entities,
            "suggested_questions": suggested_questions
        }

    def _generate_fallback_questions(self, intent: str, user_message: str, red_flags: List[str]) -> List[str]:
        """Fallback generator jika LLM tidak mengirim suggested_questions."""
        message_lower = user_message.lower()
        
        if red_flags:
            return [
                "Kapan saya harus ke IGD?",
                "Apa yang harus dilakukan sambil menunggu dokter?"
            ]
        
        if any(kw in message_lower for kw in ["gula darah", "puasa", "cek"]):
            return [
                "Berapa HbA1c yang normal?",
                "Kapan waktu terbaik cek gula darah?",
                "Apa makanan yang aman sebelum tidur?"
            ]
        
        if any(kw in message_lower for kw in ["luka", "ulkus", "gangren"]):
            return [
                "Bagaimana cara merawat luka diabetes di rumah?",
                "Kapan luka harus dibawa ke dokter?",
                "Apa tanda luka yang mulai membaik?"
            ]
        
        if any(kw in message_lower for kw in ["obat", "metformin", "insulin"]):
            return [
                "Apa efek samping obat ini?",
                "Kapan waktu terbaik minum obat?",
                "Bolehkah minum obat saat puasa?"
            ]
        
        if any(kw in message_lower for kw in ["makan", "diet", "nutrisi"]):
            return [
                "Makanan apa yang harus dihindari?",
                "Berapa porsi nasi yang aman?",
                "Bolehkah makan buah untuk diabetes?"
            ]
        
        if any(kw in message_lower for kw in ["olahraga", "latihan", "aktivitas"]):
            return [
                "Olahraga apa yang aman untuk diabetes?",
                "Berapa lama durasi olahraga yang ideal?",
                "Kapan waktu terbaik olahraga?"
            ]
        
        return [
            "Apa gejala awal diabetes?",
            "Bagaimana cara mencegah komplikasi diabetes?",
            "Berapa target gula darah yang ideal?"
        ]

    def _should_recommend_products(self, intent: str, user_message: str, entities: Dict) -> bool:
        message_lower = user_message.lower()
        
        product_keywords = [
            "produk", "obat", "suplemen", "alat", "glucometer", "meter",
            "beli", "rekomendasi", "rekomendasikan", "sarankan",
            "metformin", "insulin", "strip", "jarum"
        ]
        
        if any(kw in message_lower for kw in product_keywords):
            return True
        
        monitoring_keywords = [
            "monitor", "cek", "ukur", "test", "pantau",
            "di rumah", "mandiri", "sendiri"
        ]
        
        if any(kw in message_lower for kw in monitoring_keywords):
            return True
        
        if intent in ["product_inquiry", "medication_inquiry"]:
            return True
        
        return False

    def _should_recommend_doctor(self, intent: str, red_flags: List[str], user_message: str, entities: Dict) -> bool:
        message_lower = user_message.lower()
        
        if red_flags:
            return True
        
        doctor_keywords = [
            "dokter", "konsultasi", "konsul", "temui dokter", "ke dokter",
            "rujuk", "rujukan", "spesialis", "medis", "professional",
            "periksa", "pemeriksaan"
        ]
        
        if any(kw in message_lower for kw in doctor_keywords):
            return True
        
        serious_keywords = [
            "parah", "berat", "kronis", "komplikasi", "luka tidak sembuh",
            "gangren", "amputasi", "rawatinap", "operasi"
        ]
        
        if any(kw in message_lower for kw in serious_keywords):
            return True
        
        if intent in ["doctor_consultation", "medical_evaluation", "emergency"]:
            return True
        
        return False

    def _get_relevant_products(self, intent: str, user_message: str, red_flags: List[str]) -> List[Dict]:
        message_lower = user_message.lower()
        
        search_criteria = []
        
        if any(kw in message_lower for kw in ["monitor", "cek", "ukur", "test", "glucometer", "meter"]):
            search_criteria.append({"keywords": ["glucometer", "monitor", "meter", "cek"]})
        
        if any(kw in message_lower for kw in ["obat", "metformin", "insulin", "pengobatan"]):
            search_criteria.append({"keywords": ["metformin", "insulin", "obat", "pengobatan"]})
        
        if any(kw in message_lower for kw in ["suplemen", "vitamin", "herbal", "cinnamon", "kayu manis"]):
            search_criteria.append({"keywords": ["suplemen", "herbal", "vitamin", "cinnamon"]})
        
        if any(kw in message_lower for kw in ["luka", "perawatan luka", "ulkus", "gangren"]):
            search_criteria.append({"keywords": ["luka", "perawatan", "ulkus", "wound"]})
        
        if not search_criteria and any(kw in message_lower for kw in ["produk", "rekomendasi", "sarankan"]):
            search_criteria.append({"keywords": ["diabetes"]})
        
        if not search_criteria:
            return []
        
        products = []
        seen_ids = set()
        
        for criteria in search_criteria:
            try:
                found = self.backend_client.search_products(keywords=criteria["keywords"])
                for product in found:
                    if not isinstance(product, dict):
                        continue
                    product_id = product.get("id")
                    if product_id and product_id not in seen_ids:
                        seen_ids.add(product_id)
                        products.append(self._map_product_to_fe_format(product))
            except Exception as e:
                print(f"[Adapter] Error searching products: {e}")
                continue
        
        return products[:3]

    def _get_relevant_doctor(self, intent: str, red_flags: List[str], user_message: str, entities: Dict) -> Optional[Dict]:
        message_lower = user_message.lower()
        
        specialty_keywords = []
        
        if any(kw in message_lower for kw in ["luka", "ulkus", "gangren", "perawatan luka"]):
            specialty_keywords.extend(["luka", "wound", "ulkus", "bedah"])
        
        if any(kw in message_lower for kw in ["hormon", "endokrin", "insulin", "metabolik"]):
            specialty_keywords.extend(["endokrin", "hormon", "metabolik"])
        
        if any(kw in message_lower for kw in ["nutrisi", "diet", "makan", "gizi", "pola makan"]):
            specialty_keywords.extend(["nutrisi", "gizi", "diet"])
        
        if not specialty_keywords:
            specialty_keywords = ["diabetes", "umum", "penyakit dalam"]
        
        try:
            doctors = self.backend_client.search_doctors(keywords=specialty_keywords)
            if not doctors:
                return None
            
            doctor = doctors[0]
            if not isinstance(doctor, dict):
                return None
            
            query = self._generate_doctor_query(doctor, user_message)
            return self._map_doctor_to_fe_format(doctor, query)
        except Exception as e:
            print(f"[Adapter] Error searching doctors: {e}")
            return None

    def _generate_doctor_query(self, doctor: Dict, user_message: str) -> str:
        doctor_name = doctor.get("name", "Dokter")
        message_lower = user_message.lower()
        
        if any(kw in message_lower for kw in ["luka", "ulkus"]):
            return f"Saya ingin konsultasi dengan {doctor_name} tentang perawatan luka diabetes."
        if any(kw in message_lower for kw in ["nutrisi", "diet"]):
            return f"Saya ingin konsultasi dengan {doctor_name} tentang pola makan diabetes."
        if any(kw in message_lower for kw in ["obat", "pengobatan"]):
            return f"Saya ingin konsultasi dengan {doctor_name} tentang pengobatan diabetes."
        return f"Saya ingin konsultasi dengan {doctor_name} tentang kondisi diabetes saya."

    def _map_product_to_fe_format(self, product: Dict) -> Dict:
        return {
            "id": product.get("id", ""),
            "name": product.get("name", ""),
            "unit": product.get("specs", product.get("category", "")),
            "price": product.get("price", 0),
            "image": product.get("image", "")
        }

    def _map_doctor_to_fe_format(self, doctor: Dict, query: str) -> Dict:
        return {
            "name": doctor.get("name", ""),
            "specialty": doctor.get("specialty", ""),
            "experience": doctor.get("experience", ""),
            "image": doctor.get("image", ""),
            "query": query
        }

    def _fix_response_text(self, response_text: str, doctor: Dict, user_message: str) -> str:
        if not self.backend_client:
            return response_text
        doctor_name = doctor["name"]
        doctors = self.backend_client.get_doctors()
        for doc in doctors:
            other_name = doc.get("name", "")
            if other_name != doctor_name and other_name in response_text:
                response_text = response_text.replace(other_name, doctor_name)
        return response_text