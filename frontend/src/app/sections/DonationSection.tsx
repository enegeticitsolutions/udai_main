import { useState } from "react";
import { Heart, CreditCard, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

export function DonationSection() {
  const [donationType, setDonationType] = useState<"one-time" | "monthly">("one-time");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState("");

  const amounts = [25, 50, 100, 250, 500, 1000];

  const handleDonate = () => {
    const amount = selectedAmount || parseFloat(customAmount);
    console.log(`Donating ${amount} as ${donationType} donation`);
    // Replace with actual API call later
    alert(`Thank you for your ${donationType} donation of $${amount}!`);
  };

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Heart className="size-16 text-red-500 mx-auto mb-4 fill-red-500" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-gray-900">Make a Donation</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your generosity helps us provide essential services and support to children with special needs and their families
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 sm:p-12 shadow-2xl"
        >
          {/* Donation Type Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white rounded-xl p-1 shadow-md">
              <button
                onClick={() => setDonationType("one-time")}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  donationType === "one-time"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                One-Time
              </button>
              <button
                onClick={() => setDonationType("monthly")}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  donationType === "monthly"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Amount Selection */}
          <div className="mb-8">
            <label className="block text-lg font-medium text-gray-900 mb-4 text-center">
              Select Amount
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {amounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount("");
                  }}
                  className={`px-6 py-4 rounded-xl font-medium transition-all text-lg ${
                    selectedAmount === amount
                      ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-300"
                      : "bg-white text-gray-700 hover:bg-gray-50 shadow-md"
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="mb-8">
            <label className="block text-lg font-medium text-gray-900 mb-4 text-center">
              Or Enter Custom Amount
            </label>
            <div className="relative max-w-md mx-auto">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">
                $
              </span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-xl text-center"
              />
            </div>
          </div>

          {/* Impact Info */}
          <div className="mb-8 p-6 bg-white rounded-xl shadow-md">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="size-5 text-green-500" />
              Your Impact
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• $25 provides educational materials for one child</p>
              <p>• $50 funds one therapy session</p>
              <p>• $100 supports a child for one week</p>
              <p>• $250 sponsors a complete educational program</p>
            </div>
          </div>

          {/* Donate Button */}
          <button
            onClick={handleDonate}
            disabled={!selectedAmount && !customAmount}
            className="w-full px-8 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 font-medium text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            <CreditCard className="size-6" />
            Donate {selectedAmount || customAmount ? `$${selectedAmount || customAmount}` : ""} {donationType === "monthly" ? "Monthly" : "Now"}
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Secure payment • Tax-deductible • 100% goes to programs
          </p>
        </motion.div>
      </div>
    </section>
  );
}
