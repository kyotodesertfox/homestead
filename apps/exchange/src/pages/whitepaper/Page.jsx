import { FileDown } from 'lucide-react';

const Section = ({ title, children }) => (
  <section className="mb-14 print:mb-10">
    <h2 className="text-xl font-black uppercase tracking-widest text-hub-green mb-4 print:text-black">{title}</h2>
    <div className="space-y-4 text-gray-700 leading-relaxed text-sm print:text-black">{children}</div>
  </section>
);

const Sub = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-2">{title}</h3>
    <div className="space-y-3 text-gray-600 text-sm leading-relaxed print:text-black">{children}</div>
  </div>
);

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16 print:py-8 print:px-0">

        {/* Header */}
        <div className="mb-14 print:mb-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-hub-green mb-2 print:text-black">Technical Whitepaper</p>
              <h1 className="text-4xl font-black text-gray-900 leading-tight">Homestead</h1>
              <p className="text-lg text-gray-500 mt-2 font-medium">A decentralized protocol for direct commerce and quantum-safe messaging</p>
            </div>
            <button
              onClick={() => window.print()}
              className="print:hidden flex items-center gap-2 border border-gray-200 hover:border-hub-green text-gray-600 hover:text-hub-green font-black uppercase tracking-widest text-xs px-4 py-2.5 rounded-lg transition-all"
            >
              <FileDown size={14} />
              PDF
            </button>
          </div>
          <div className="border-t border-gray-100 pt-6 flex gap-8 text-xs text-gray-400 font-medium uppercase tracking-widest">
            <span>Version 1.0</span>
            <span>June 2026</span>
            <span>Taiko Mainnet</span>
          </div>
        </div>

        {/* Abstract */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 mb-14 print:border print:mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Abstract</p>
          <p className="text-sm text-gray-700 leading-relaxed print:text-black">
            Homestead is an on-chain protocol built on Taiko that enables producers of real goods to sell directly to buyers without intermediaries, using NFTs as claim tickets backed by production collateral. Every message exchanged between parties is encrypted using a hybrid X25519 and ML-KEM-768 scheme, making the messaging layer resistant to both classical and quantum attacks. The protocol coordinates treasury management, decentralized exchange, marketplace settlement, and encrypted communications through a set of upgradeable smart contracts. No platform fee is extracted by a third party. Value accrues to producers, stakers, and the ecosystem floor.
          </p>
        </div>

        <Section title="1. The Problem">
          <p>
            Modern commerce platforms sit between producers and buyers, extracting value from both sides. Fees compound across listing, sale, and settlement. Data is harvested. Messaging is surveilled. Producers of real goods — farmers, craftspeople, small-scale manufacturers — have no path to market that doesn't route through an intermediary who captures the relationship.
          </p>
          <p>
            At the same time, every digital message sent today is potentially being harvested and stored. This is not a theoretical concern. The cryptographic algorithms protecting internet communications — RSA, elliptic curve — are mathematically vulnerable to sufficiently powerful quantum computers. When those computers exist, retroactively stored ciphertext becomes readable. Messages sent today will be decrypted tomorrow.
          </p>
          <p>
            Existing blockchain messaging protocols address neither problem adequately. They encrypt with classical algorithms only, ignore the harvest-now-decrypt-later threat model, and do not integrate with real commerce settlement.
          </p>
        </Section>

        <Section title="2. The Solution">
          <p>
            Homestead replaces the intermediary with a set of transparent, upgradeable smart contracts. A producer stakes ETH as collateral, mints production tokens against that collateral, commits those tokens to NFTs, and lists them on the marketplace. A buyer purchases the NFT, which serves as a claim ticket. On redemption, the buyer receives the physical good and the producer receives ETH. No platform holds custody of either side at any point.
          </p>
          <p>
            All coordination between parties happens through the Homestead Relay — an on-chain messaging contract that enforces hybrid post-quantum encryption. Every message is encrypted client-side before hitting the chain. The encrypted payload lives in event logs permanently, but only the intended recipient, holding the correct private key, can ever decrypt it.
          </p>
          <Sub title="Quantum-Safe Messaging">
            <p>
              The encryption scheme combines two independent algorithms: X25519 elliptic-curve Diffie-Hellman for classical security, and ML-KEM-768 (Kyber) for post-quantum security. Both produce independent shared secrets. Those secrets are merged through HKDF and used to derive a single AES-256-GCM key for the actual message encryption.
            </p>
            <p>
              An attacker must break both algorithms to read a message. X25519 provides battle-tested classical security. ML-KEM-768 is a NIST-standardized lattice-based algorithm resistant to Shor's algorithm on quantum hardware. Neither algorithm alone is sufficient — both must be defeated simultaneously.
            </p>
            <p>
              Keys are derived from a deterministic wallet signature. No private key is ever stored. Any device can re-derive the same key pair by signing the same message with the same wallet. The public keys are registered on-chain so any sender can encrypt to any registered recipient without prior communication.
            </p>
          </Sub>
        </Section>

        <Section title="3. Protocol Architecture">
          <Sub title="Treasury">
            <p>
              The Treasury is the economic core of the protocol. Producers deposit ETH via <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">postStake()</code>, receiving stkHomestead tokens 1:1 in wei. This ETH is permanently locked as the ecosystem floor — it does not leave the system under any normal operation.
            </p>
            <p>
              stkHomestead serves as a production credential. Producers open lots against their collateral position, mint production tokens, and commit those tokens to NFTs. As NFTs are redeemed, collateral is released and pro-rata ETH becomes claimable. The floor only grows — fees received by the Treasury in ETH accumulate as unattributed surplus above the staker floor.
            </p>
          </Sub>
          <Sub title="Marketplace">
            <p>
              Listings are created by producers, associating an NFT collection with a production batch and a payment token. Buyers purchase using the production token, with a protocol fee routed to the Treasury. The buyer's tokens are escrowed. On redemption, the buyer's escrowed tokens are burned, the producer's collateral tokens are released and swapped for ETH through the DEX, and the proceeds go to the producer directly.
            </p>
          </Sub>
          <Sub title="DEX">
            <p>
              A constant-product AMM with configurable entry and exit fees. Exit fees are split between liquidity providers and the Treasury floor. Liquidity providers earn a share of exit fees proportional to their position. The Router handles all swap routing and fee distribution in a single transaction.
            </p>
          </Sub>
          <Sub title="Relay">
            <p>
              The Relay stores X25519 and ML-KEM-768 public keys for every registered participant. Messages are sent as encrypted byte payloads in event logs. The Relay enforces key registration before quantum messages can be sent, and charges a fee in the protocol token or ETH per quantum message.
            </p>
          </Sub>
        </Section>

        <Section title="4. Token Economics">
          <p>
            The protocol token ($QUANTUM) is burned per encrypted message sent through the Relay. Senders may alternatively pay a fixed ETH fee, which routes to the Treasury floor. The burn mechanic is deflationary — supply decreases with usage.
          </p>
          <p>
            Production tokens are minted by producers against their collateral position and burned on NFT redemption. They are not speculative assets — their value is anchored to the goods they represent. The DEX provides price discovery and liquidity for production token swaps on settlement.
          </p>
          <p>
            stkHomestead is a non-transferable credential. It is minted 1:1 with staked ETH and burned as ETH is claimed back through the redemption cycle. It establishes production capacity and reflects cumulative commitment to the ecosystem.
          </p>
          <p>
            The architect's surplus — ETH accumulated in the Treasury above the staker floor — is extractable by the contract owner without affecting any staker position. This is the protocol's primary revenue mechanism for its builders.
          </p>
        </Section>

        <Section title="5. Attestation and Trust">
          <p>
            Participants are assigned attestation tiers (0-3) based on their cumulative stake history. Tier thresholds are set by the protocol owner and reflect economic commitment to the ecosystem.
          </p>
          <p>
            Attestation can also be granted manually by designated attesters — allowing trusted providers who have been onboarded through other means to participate at the appropriate tier without requiring stake as a prerequisite.
          </p>
          <p>
            No personal identity information is collected or stored at any layer. Attestation is purely on-chain and stake-derived.
          </p>
        </Section>

        <Section title="6. Why Now">
          <p>
            Quantum computing is advancing faster than public awareness of the implications. The National Institute of Standards and Technology finalized ML-KEM (Kyber) as a post-quantum key encapsulation standard in 2024. Major cloud providers are beginning to offer quantum-resistant TLS. The window to retroactively protect communications is closing.
          </p>
          <p>
            Harvest-now-decrypt-later attacks are not speculative — intelligence agencies and well-resourced adversaries are storing encrypted traffic today against the day quantum hardware matures. Any message sent over a classical-only channel is potentially compromised in the future.
          </p>
          <p>
            Homestead is built with this assumption from day one. It is the only on-chain messaging and commerce protocol that treats post-quantum security as a baseline requirement rather than a future consideration.
          </p>
        </Section>

        <Section title="7. Deployment">
          <p>
            All contracts are deployed on Taiko Mainnet (chainId 167000). The protocol is operational. Key contracts:
          </p>
          <div className="font-mono text-xs space-y-2 bg-gray-50 border border-gray-100 rounded-lg p-4 print:border">
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Treasury</span><span className="text-gray-900 break-all">0x631f9D082019E25a2BfD219BF235cA0b742206EC</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Marketplace</span><span className="text-gray-900 break-all">0x2321bDF62364ee38Fcf6b631C9742f6BF61B66Aa</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Relay</span><span className="text-gray-900 break-all">0x96FC77220d578aF5D4380Dc2D2248Ed31444C491</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">DEX Factory</span><span className="text-gray-900 break-all">0xC72096f120cBb6a8f9e942864b885e1bb5060Cf2</span></div>
          </div>
          <p>
            All contracts are UUPS upgradeable. Source code is available in the project repository. The protocol is in active development — the Router upgrade, governance module, and companion application are in progress.
          </p>
        </Section>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-8 mt-8 text-xs text-gray-400 font-medium space-y-1 print:pt-4">
          <p>Homestead Protocol — Taiko Mainnet</p>
          <p>This document describes a live protocol. Contract addresses and parameters are subject to change through the upgrade process.</p>
        </div>

      </div>
    </div>
  );
}
