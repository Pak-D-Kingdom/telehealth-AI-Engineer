"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SkinIssues from "@/components/SkinIssues";
import HowItWorks from "@/components/HowItWorks";
import ProductsShowcase from "@/components/ProductsShowcase";
import Dermatologists from "@/components/Dermatologists";
import TrustBar from "@/components/TrustBar";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);

  const handleOpenChat = (query?: string) => {
    setInitialQuery(query);
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        <Navbar onOpenChat={handleOpenChat} />
        <main>
          <Hero onOpenChat={handleOpenChat} />
          <TrustBar />
          <SkinIssues onOpenChat={handleOpenChat} />
          <HowItWorks onOpenChat={handleOpenChat} />
          <ProductsShowcase onOpenChat={handleOpenChat} />
          <Dermatologists onOpenChat={handleOpenChat} />
        </main>
      </div>
      <Footer />

      {/* Floating & Modal AI Chatbot */}
      <ChatBot
        isOpen={isChatOpen}
        onOpen={handleOpenChat}
        onClose={handleCloseChat}
        initialQuery={initialQuery}
      />
    </div>
  );
}
