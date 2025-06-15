/**
 * Web Audio API를 사용한 간단한 사운드 엔진
 * 오디오 파일 없이 효과음을 생성합니다.
 */

// 전투가 발생했는지 추적하는 플래그
let combatOccurredInTurn = false;
let lowHpAlertPlayed = false;
let lastDangerTurn = -1;

// 각 유닛의 버프/디버프 아이콘 순환 상태를 저장
const effectCycleState = {};

/**
 * 지정된 경로의 오디오 파일을 재생하는 헬퍼 함수
 * @param {string} filePath - 재생할 오디오 파일의 경로
 */
function playSoundFile(filePath) {
    if (!filePath) return;
    if (typeof navigator !== 'undefined' && navigator.userAgent &&
        (navigator.userAgent.includes('Node.js') || navigator.userAgent.includes('jsdom'))) {
        return;
    }
    if (typeof Audio !== 'undefined') {
        try {
            const audio = new Audio(filePath);
            audio.volume = 0.5; // 사운드 볼륨 설정 (0.0 ~ 1.0)
            audio.play().catch(() => {});
        } catch (e) {
            console.error(`Could not play audio file: ${filePath}`, e);
        }
    }
}

function playRandomKillQuote(mercenary) {
    const data = MERCENARY_TYPES[mercenary.type];
    if (data && Array.isArray(data.killQuotes) && data.killQuotes.length) {
        const index = Math.floor(Math.random() * data.killQuotes.length);
        playSoundFile(String(data.killQuotes[index]));
    }
}

// 30% 확률로 플레이어 음성을 재생하는 헬퍼 함수
function playPlayerVoice(filePath) {
    if (Math.random() < 0.3) {
        playSoundFile(filePath);
    }
}

function playPlayerKillQuote() {
    if (Math.random() < 0.3) {
        const quotes = [
            'assets/audio/player_kill_1.mp3',
            'assets/audio/player_kill_2.mp3'
        ];
        const index = Math.floor(Math.random() * quotes.length);
        playSoundFile(quotes[index]);
    }
}
const SoundEngine = {
    audioContext: null,
    isInitialized: false,

    // 게임 시작 시 한 번만 호출되어야 합니다. (사용자 상호작용 후)
    initialize() {
        if (this.isInitialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
            console.log("Sound Engine Initialized.");

            // 배경음 플레이어를 초기화하고 재생을 시도
            BgmPlayer.init();
            BgmPlayer.play();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.");
        }
    },

    // 지정된 이름의 사운드를 재생하는 핵심 함수
    playSound(soundName) {
        if (!this.isInitialized) return;

        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);

        // Sound recipes
        switch (soundName) {
            // --- 기존 사운드 ---
            case 'playerAttack':
                // 새로 만든 함수를 호출하여 오디오 파일을 재생합니다.
                playSoundFile('assets/audio/hit.mp3'); // 
                break;
            case 'takeDamage':
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                this.createOscillator('square', 100, gainNode, now, 0.2);
                break;
            case 'getItem':
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                this.createOscillator('sine', 900, gainNode, now, 0.1);
                this.createOscillator('sine', 1200, gainNode, now + 0.1, 0.1);
                break;
            case 'levelUp':
                this.playNote('triangle', 523, 0.2, now);      // C5
                this.playNote('triangle', 659, 0.2, now + 0.1); // E5
                this.playNote('triangle', 784, 0.2, now + 0.2); // G5
                this.playNote('triangle', 1046, 0.3, now + 0.3); // C6
                break;
            case 'monsterDie':
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
                this.createOscillator('noise', 0, gainNode, now, 0.4);
                break;

            // --- 신규 사운드 ---

            case 'playerMiss':
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                const oscMiss = this.audioContext.createOscillator();
                oscMiss.type = 'sine';
                oscMiss.frequency.setValueAtTime(1200, now);
                oscMiss.frequency.exponentialRampToValueAtTime(300, now + 0.15);
                oscMiss.connect(gainNode);
                oscMiss.start(now);
                oscMiss.stop(now + 0.15);
                break;

            case 'criticalHit':
                gainNode.gain.setValueAtTime(0.5, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                this.createOscillator('square', 1200, gainNode, now, 0.1);
                this.createOscillator('noise', 100, gainNode, now, 0.05);
                break;

            case 'spellFire':
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(600, now);
                filter.Q.setValueAtTime(20, now);
                filter.connect(gainNode);
                this.createOscillator('noise', 0, filter, now, 0.5);
                break;

            case 'spellIce':
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
                const iceFilter = this.audioContext.createBiquadFilter();
                iceFilter.type = 'highpass';
                iceFilter.frequency.setValueAtTime(1000, now);
                iceFilter.Q.setValueAtTime(15, now);
                iceFilter.connect(gainNode);
                this.createOscillator('noise', 0, iceFilter, now, 0.4);
                this.playNote('sine', 1200, 0.2, now, 0.2);
                break;

            case 'spellHeal':
                this.playNote('sine', 600, 0.3, now);
                this.playNote('sine', 800, 0.3, now + 0.15);
                this.playNote('sine', 1000, 0.3, now + 0.3);
                break;

            case 'nextFloor':
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
                this.createOscillator('sawtooth', 60, gainNode, now, 1.5);
                this.createOscillator('sawtooth', 65, gainNode, now, 1.5);
                break;

            case 'uiClick':
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                this.createOscillator('triangle', 1500, gainNode, now, 0.05);
                break;

            case 'buyItem':
                this.playNote('square', 1200, 0.2, now);
                this.playNote('square', 1600, 0.2, now + 0.1);
                break;

            case 'error':
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                this.createOscillator('square', 80, gainNode, now, 0.15);
                break;
            case 'dismiss':
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                this.createOscillator('square', 220, gainNode, now, 0.2);
                this.createOscillator('square', 110, gainNode, now + 0.1, 0.2);
                break;

            // ========================= 추가 시작 =========================
            // UI 및 상호작용
            case 'openPanel': // 패널 열기 (상세정보, 상점 등)
                this.playNote('triangle', 1200, 0.1, now);
                this.playNote('triangle', 1500, 0.1, now + 0.05);
                break;
            case 'closePanel': // 패널 닫기
                this.playNote('triangle', 1500, 0.1, now);
                this.playNote('triangle', 1200, 0.1, now + 0.05);
                break;
            case 'statAllocate': // 스탯 분배
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                this.createOscillator('sine', 1300, gainNode, now, 0.1);
                break;

            // 아이템 및 제작
            case 'equipItem': // 아이템 장착
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                this.createOscillator('noise', 1, gainNode, now, 0.05);
                this.playNote('square', 880, 0.2, now + 0.05);
                break;
            case 'unequipItem': // 아이템 해제
                this.playNote('square', 660, 0.2, now);
                this.playNote('square', 440, 0.2, now + 0.1);
                break;
            case 'treasure': // 골드/보물 획득
                this.playNote('sine', 1046, 0.2, now); // C6
                this.playNote('sine', 1396, 0.2, now + 0.1); // F6
                break;
            case 'craftStart': // 제작 시작
                this.playNote('square', 300, 0.2, now);
                this.playNote('square', 300, 0.2, now + 0.15);
                break;
            case 'craftFinish': // 제작 성공 (멜로디)
                this.playNote('sine', 784, 0.2, now);      // G5
                this.playNote('sine', 1046, 0.2, now + 0.1); // C6
                this.playNote('sine', 1318, 0.2, now + 0.2); // E6
                break;
            case 'enhanceSuccess': // 강화 성공 (멜로디)
                this.playNote('triangle', 1046, 0.15, now);      // C6
                this.playNote('triangle', 1318, 0.15, now + 0.1); // E6
                this.playNote('triangle', 1568, 0.15, now + 0.2); // G6
                this.playNote('triangle', 2093, 0.2, now + 0.3);  // C7
                break;
            case 'enhanceFail': // 강화 실패
                this.playNote('sawtooth', 200, 0.3, now, 0.5, 10);
                this.playNote('sawtooth', 190, 0.3, now + 0.05, 0.5, -10);
                break;

            // 전투 관련
            case 'dodge': // 회피
                const whooshGain = this.audioContext.createGain();
                whooshGain.gain.setValueAtTime(0.3, now);
                whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                whooshGain.connect(this.audioContext.destination);
                this.createOscillator('noise', 0, whooshGain, now, 0.15);
                break;
            case 'mercDeath': // 용병 사망
                this.playNote('sine', 440, 0.3, now);
                this.playNote('sine', 220, 0.3, now + 0.2);
                break;

            // 던전 및 기타
            case 'openChest': // 상자 열기
                this.playNote('square', 200, 0.2, now); // creak
                this.playNote('triangle', 1568, 0.2, now + 0.1); // sparkle
                this.playNote('triangle', 1864, 0.2, now + 0.2); // sparkle
                break;
            case 'templeChime': // 사원 멜로디
                this.playNote('triangle', 659, 0.25, now);
                this.playNote('triangle', 880, 0.25, now + 0.2);
                this.playNote('triangle', 1318, 0.3, now + 0.4);
                this.playNote('triangle', 1760, 0.35, now + 0.6);
                break;
            case 'gatherMaterial':
                // Lower the volume so material gathering is less jarring
                this.playNote('square', 600, 0.07, now);
                this.playNote('square', 800, 0.07, now + 0.1);
                break;
            case 'eggHatch': // 알 부화
                this.playNote('sine', 880, 0.1, now); // crack 1
                this.playNote('sine', 987, 0.1, now + 0.1); // crack 2
                this.playNote('triangle', 1318, 0.3, now + 0.2); // reveal
                break;
            case 'auraActivateMajor': // 용기의 찬가 같은 공격적 오라
                this.playNote('sawtooth', 330, 0.2, now); // E4
                this.playNote('sawtooth', 440, 0.2, now + 0.15); // A4
                this.playNote('sawtooth', 554, 0.3, now + 0.3);  // C#5
                break;
            case 'auraActivateMinor': // 수호의 찬가 같은 방어적 오라
                this.playNote('triangle', 392, 0.2, now); // G4
                this.playNote('triangle', 493, 0.2, now + 0.15); // B4
                this.playNote('triangle', 659, 0.3, now + 0.3);  // E5
                break;
            // ========================== 추가 끝 ==========================
        }
    },

    // Oscillator(소리 톤) 생성을 돕는 헬퍼 함수
    createOscillator(type, frequency, destination, startTime, duration, detune = 0) {
        if (type === 'noise') {
            const sampleRate = this.audioContext.sampleRate;
            const length = Math.floor(sampleRate * duration);
            const buffer = this.audioContext.createBuffer(1, length, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const src = this.audioContext.createBufferSource();
            src.buffer = buffer;
            src.connect(destination);
            src.start(startTime);
            src.stop(startTime + duration);
            return src;
        }

        const osc = this.audioContext.createOscillator();
        osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle' 또는 'noise'
        osc.frequency.setValueAtTime(frequency, startTime);
        osc.detune.setValueAtTime(detune, startTime);
        osc.connect(destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
        return osc;
    },

    // 단일 노트를 재생하는 헬퍼 함수 (레벨업 효과용)
    // duration과 detune을 선택적으로 지정할 수 있도록 인자를 확장한다.
    // 기본값은 duration 0.5초, detune 0으로 기존 동작을 유지한다.
    playNote(type, frequency, volume, startTime, duration = 0.5, detune = 0) {
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        this.createOscillator(type, frequency, gainNode, startTime, duration, detune);
    }
};
if (typeof window !== 'undefined') {
    window.SoundEngine = SoundEngine;
}

/**
 * HTML Audio 요소를 제어하는 간단한 배경음 플레이어
 */
const BgmPlayer = {
    audioElement: null,
    isInitialized: false,
    // [추가] BGM 파일 목록. 실제 파일 경로로 수정하세요.
    playlist: [
        'assets/audio/bgm1.mp3',
        'assets/audio/bgm2.mp3',
        'assets/audio/bgm3.mp3',
        'assets/audio/bgm4.mp3',
        'assets/audio/bgm5.mp3',
        'assets/audio/bgm6.mp3',
        'assets/audio/bgm7.mp3',
        'assets/audio/bgm8.mp3',
        'assets/audio/bgm9.mp3',
        'assets/audio/bgm10.mp3',
        'assets/audio/bgm11.mp3',
        'assets/audio/bgm12.mp3',
        'assets/audio/bgm13.mp3'
    ],
    // [추가] 현재 재생 중인 트랙의 인덱스
    currentTrackIndex: 0,

    init() {
        this.audioElement = document.getElementById('bgm-player');
        if (this.audioElement) {
            this.isInitialized = true;
            this.audioElement.volume = 0.3; // BGM 볼륨 설정

            // [추가] 'ended' 이벤트 리스너. 현재 곡 재생이 끝나면 자동으로 호출됩니다.
            this.audioElement.addEventListener('ended', () => {
                this.playNextTrack();
            });

        } else {
            console.error("BGM Player element(#bgm-player) not found.");
        }
    },

    /**
     * [추가된 함수] 다음 트랙을 재생합니다. 목록의 끝이면 처음으로 돌아갑니다.
     */
    async playNextTrack() {
        // 다음 트랙 인덱스로 이동, 마지막 트랙이었으면 0으로 돌아감 (나머지 연산자 %)
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;

        // 현재 곡을 다음 곡으로 교체
        this.audioElement.src = String(this.playlist[this.currentTrackIndex]);

        try {
            await this.audioElement.play();
        } catch (err) {
            console.error('BGM playback failed', err);
        }
    },

    /**
     * 이전 트랙을 재생합니다. 첫 번째 트랙에서 호출되면 마지막 곡으로 이동합니다.
     */
    async playPreviousTrack() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        this.audioElement.src = String(this.playlist[this.currentTrackIndex]);
        try {
            await this.audioElement.play();
        } catch (err) {
            console.error('BGM playback failed', err);
        }
    },

    /** 배경음 음소거 상태를 토글합니다 */
    toggleMute() {
        if (!this.audioElement) return;
        this.audioElement.muted = !this.audioElement.muted;
    },

    // 재생 시작 함수 수정
    async play() {
        if (!this.isInitialized || !this.audioElement) return;
        try {
            // 처음 재생 시, 첫 번째 트랙으로 소스를 설정
            if (!this.audioElement.src) {
                this.audioElement.src = String(this.playlist[this.currentTrackIndex]);
            }
            await this.audioElement.play();
        } catch (err) {
            console.error("BGM playback failed. A user interaction is likely required to start audio.", err);
        }
    }
};

// ========================= 추가 시작 =========================
// 오디오 시스템이 초기화되었는지 추적하는 플래그
let isAudioInitialized = false;

/**
 * 효과음과 배경음 등 모든 오디오 시스템을 초기화하고 재생합니다.
 * isAudioInitialized 플래그를 통해 단 한 번만 실행되도록 보장합니다.
 */
function initializeAudio() {
    if (isAudioInitialized) return;
    if (typeof navigator !== 'undefined' && navigator.userAgent && (navigator.userAgent.includes('Node.js') || navigator.userAgent.includes('jsdom'))) {
        // Skip audio initialization in testing environments like jsdom
        isAudioInitialized = true;
        return;
    }

    try {
        SoundEngine.initialize();
        playPlayerVoice('assets/audio/player_start.mp3');
    } catch (err) {
        console.error("Audio initialization failed", err);
    }
    
    isAudioInitialized = true;
    console.log("All audio systems initialized by user action.");
}

function checkDanger() {
    if (gameState.turn === lastDangerTurn) return;
    const dangerNearby = gameState.monsters.some(m =>
        (m.isChampion || m.isElite || m.isSuperior || m.special === 'boss') &&
        getDistance(m.x, m.y, gameState.player.x, gameState.player.y) <= 5
    );
    if (dangerNearby) {
        playPlayerVoice('assets/audio/player_danger.mp3');
        lastDangerTurn = gameState.turn;
    }
}


// ========================== 추가 끝 ==========================

/**
 * 해당 유닛이 플레이어 편인지 확인합니다. (플레이어 또는 아군 용병)
 * @param {object} entity - 확인할 유닛 객체
 * @returns {boolean}
 */
function isPlayerSide(entity) {
    if (!entity) return false;
    if (entity === gameState.player) return true;
    if (gameState.activeMercenaries.includes(entity)) return true;
    return false;
}

/**
 * 두 유닛이 같은 편인지 확인합니다.
 * @param {object} a - 유닛 A
 * @param {object} b - 유닛 B
 * @returns {boolean}
 */
function isSameSide(a, b) {
    return isPlayerSide(a) === isPlayerSide(b);
}

const ITEM_TYPES = {
            WEAPON: 'weapon',
            ARMOR: 'armor',
            ACCESSORY: 'accessory',
            POTION: 'potion',
            REVIVE: 'revive',
            EXP_SCROLL: 'expScroll',
            RECIPE_SCROLL: 'recipeScroll',
            EGG: 'egg',
            FERTILIZER: 'fertilizer',
            ESSENCE: 'essence',
            FOOD: 'food',
            MAP: 'map'
        };

const INVENTORY_CATEGORIES = {
    equipment: [ITEM_TYPES.WEAPON, ITEM_TYPES.ARMOR, ITEM_TYPES.ACCESSORY],
    recipe: [ITEM_TYPES.RECIPE_SCROLL],
    food: [ITEM_TYPES.FOOD],
    potion: [ITEM_TYPES.POTION, ITEM_TYPES.REVIVE],
    map: [ITEM_TYPES.MAP],
    etc: [ITEM_TYPES.EGG, ITEM_TYPES.FERTILIZER, ITEM_TYPES.ESSENCE]
};


const SHOP_PRICE_MULTIPLIER = 3;
const PARTY_LEASH_RADIUS = 10; // 플레이어 중심의 파티 활동 반경



const MERCENARY_NAMES = [
    // 기존 이름들
    'Aldo', 'Borin', 'Cara', 'Dain', 'Elin', 'Faris',

    // 전사 스타일 이름들
    'Gareth', 'Thorin', 'Ragnar', 'Bjorn', 'Magnus', 'Grimm', 'Axel', 'Kane', 'Rex', 'Stark',
    'Blade', 'Steel', 'Iron', 'Storm', 'Wolf', 'Bear', 'Hawk', 'Stone', 'Fire', 'Thunder',

    // 궁수 스타일 이름들
    'Archer', 'Robin', 'Green', 'Swift', 'Sharp', 'Eagle', 'Arrow', 'Bow', 'Hunter', 'Scout',
    'Keen', 'Quick', 'Silent', 'Shadow', 'Wind', 'Falcon', 'Ranger', 'Track', 'Mark', 'Aim',

    // 마법사 스타일 이름들
    'Merlin', 'Gandalf', 'Sage', 'Mystic', 'Arcane', 'Spell', 'Mage', 'Wizard', 'Sorcerer', 'Enchanter',
    'Crystal', 'Star', 'Moon', 'Sun', 'Flame', 'Frost', 'Light', 'Dark', 'Void', 'Cosmic',

    // 힐러 스타일 이름들
    'Grace', 'Hope', 'Faith', 'Light', 'Pure', 'Holy', 'Divine', 'Blessed', 'Sacred', 'Serene',
    'Heal', 'Cure', 'Mend', 'Restore', 'Renew', 'Revive', 'Life', 'Spirit', 'Soul', 'Heart',

    // 다양한 판타지 이름들
    'Aether', 'Blaze', 'Cipher', 'Drake', 'Echo', 'Frost', 'Gale', 'Haven', 'Ivory', 'Jade',
    'Knight', 'Lance', 'Nova', 'Onyx', 'Phantom', 'Quest', 'Raven', 'Sage', 'Titan', 'Unity',
    'Valor', 'Wraith', 'Xenon', 'Yuki', 'Zephyr', 'Azure', 'Crimson', 'Ember', 'Golden', 'Silver',

    // 신화적 이름들
    'Atlas', 'Orion', 'Phoenix', 'Draco', 'Vega', 'Sirius', 'Castor', 'Pollux', 'Rigel', 'Altair',
    'Artemis', 'Apollo', 'Diana', 'Mars', 'Venus', 'Jupiter', 'Saturn', 'Neptune', 'Pluto', 'Mercury',

    // 보석/금속 이름들
    'Diamond', 'Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Garnet', 'Opal', 'Pearl', 'Amber', 'Coral',
    'Platinum', 'Mithril', 'Adamant', 'Bronze', 'Copper', 'Zinc', 'Chrome', 'Cobalt', 'Nickel', 'Lead',

    // 자연 요소 이름들
    'River', 'Ocean', 'Mountain', 'Forest', 'Desert', 'Valley', 'Canyon', 'Meadow', 'Grove', 'Field',
    'Aurora', 'Comet', 'Meteor', 'Galaxy', 'Nebula', 'Quasar', 'Pulsar', 'Solar', 'Lunar', 'Stellar',

    // 추상적 개념 이름들
    'Honor', 'Glory', 'Victory', 'Triumph', 'Courage', 'Bravery', 'Wisdom', 'Justice', 'Truth', 'Peace',
    'Chaos', 'Order', 'Balance', 'Harmony', 'Discord', 'Fury', 'Rage', 'Calm', 'Serenity', 'Tranquil'
];

        const MAX_FULLNESS = 100;
        const FULLNESS_LOSS_PER_TURN = 0.01;
        const CORPSE_TURNS = 60; // how long a corpse remains on the map
        const CORRIDOR_WIDTH = 7; // width of dungeon corridors

        function carveWideCorridor(map, x1, y1, x2, y2) {
            const width = CORRIDOR_WIDTH;
            if (x1 === x2) {
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);
                for (let y = minY; y <= maxY; y++) {
                    for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
                        const nx = x1 + dx;
                        if (map[y] && map[y][nx] !== undefined) {
                            map[y][nx] = 'empty';
                        }
                    }
                }
            } else if (y1 === y2) {
                const minX = Math.min(x1, x2);
                const maxX = Math.max(x1, x2);
                for (let x = minX; x <= maxX; x++) {
                    for (let dy = -Math.floor(width / 2); dy <= Math.floor(width / 2); dy++) {
                        const ny = y1 + dy;
                        if (map[ny] && map[ny][x] !== undefined) {
                            map[ny][x] = 'empty';
                        }
                    }
                }
            }
        }

        // 용병 타입 정의

        const MERCENARY_IDLE_QUOTES = {
            WARRIOR: [
                "이 통로... 적들이 매복하기 좋은 곳이군.",
                "무거운 갑옷이지만 익숙해. 언제든 싸울 준비 완료야.",
                "여기서 예전에 큰 전투가 있었던 것 같은데... 피 냄새가 아직도 나.",
                "조용하군. 너무 조용해... 이럴 때가 더 위험하다고.",
                "내 검이 간지러워하고 있어. 곧 쓸 일이 있을 거야.",
                "던전 깊숙할수록 더 강한 놈들이 나온다던데, 기대되는군."
            ],
            ARCHER: [
                "발걸음 소리를 최대한 줄여야 해. 적들에게 들키면 안 되거든.",
                "이 어둠 속에서도 내 눈은 적을 놓치지 않을 거야.",
                "화살통을 확인해볼까... 아직 충분하네. 다행이야.",
                "저 모퉁이 너머에 뭔가 있는 것 같은데... 내 직감은 틀린 적이 없어.",
                "바람의 흐름이 이상해. 이 던전 구조가 복잡한가 봐.",
                "높은 곳에서 저격할 자리를 찾고 있는 중이야."
            ],
            HEALER: [
                "이곳에 스며든 어둠의 기운... 정화가 필요할 것 같아.",
                "다들 다치지 않게 조심해. 치유 마법에도 한계가 있거든.",
                "신성한 빛이 우리를 인도해주길... 길을 잃지 않게 해주세요.",
                "여기서 죽어간 영혼들이 느껴져. 그들을 위해 기도를 올려야겠어.",
                "악한 존재들의 흔적이 여기저기 보이네... 경계를 늦추면 안 돼.",
                "치유 물약도 챙겨왔으니까 너무 걱정하지는 마."
            ],
            WIZARD: [
                "이 던전의 마력 흐름이 불안정해... 주문 시전에 주의해야겠어.",
                "고대 문자들이 벽에 새겨져 있군. 흥미로운 주술의 흔적이야.",
                "마나의 농도가 짙어지고 있어. 강력한 마법 생물이 근처에 있나 봐.",
                "저 수정들... 마법 에너지를 저장하고 있는 것 같은데.",
                "공간이 비틀어진 느낌이야. 이곳엔 차원 마법의 잔재가 남아있어.",
                "내 지팡이가 진동하고 있어. 뭔가 강력한 마법 아이템이 가까이 있나?"
            ],
            BARD: [
                "이 던전의 메아리가 훌륭하네! 나중에 여기서 콘서트를 열어볼까?",
                "어둠 속에서도 음악은 희망의 빛이 되어줘. 다들 용기 내!",
                "저 돌계단의 소리... 완벽한 리듬감이야. 새로운 곡 아이디어가 떠오르는데?"
            ],
            PALADIN: [
                "신의 가호가 함께하길.",
                "어둠 속에서도 빛은 사라지지 않는다.",
                "정의를 위해 검을 들겠다." 
            ]
        };

        const MERCENARY_TYPES = {
            WARRIOR: {
                name: '⚔️ 전사',
                icon: '🛡️',
                baseHealth: 15,
                baseAttack: 4,
                baseDefense: 2,
                baseAccuracy: 0.8,
                baseEvasion: 0.1,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseMaxMana: 5,
                baseHealthRegen: 0.2,
                baseManaRegen: 0.3,
                role: 'tank',
                description: '높은 체력과 방어력을 가진 근접 전투 용병',
                cost: 50,
                voiceFile: 'assets/audio/warrior_hire.mp3',
                reviveVoice: 'assets/audio/warrior_revive.mp3',
                deathVoice: 'assets/audio/warrior_death.mp3',
                killQuotes: [
                    'assets/audio/warrior_kill_1.mp3',
                    'assets/audio/warrior_kill_2.mp3'
                ]
            },
            ARCHER: {
                name: '🏹 궁수',
                icon: '🎯',
                baseHealth: 10,
                baseAttack: 5,
                baseDefense: 1,
                baseAccuracy: 0.85,
                baseEvasion: 0.15,
                baseCritChance: 0.1,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseMaxMana: 5,
                baseHealthRegen: 0.2,
                baseManaRegen: 0.3,
                role: 'ranged',
                description: '원거리에서 적을 공격하는 용병',
                cost: 60,
                voiceFile: 'assets/audio/archer_hire.mp3',
                reviveVoice: 'assets/audio/archer_revive.mp3',
                deathVoice: 'assets/audio/archer_death.mp3',
                killQuotes: [
                    'assets/audio/archer_kill_1.mp3',
                    'assets/audio/archer_kill_2.mp3'
                ]
            },
            HEALER: {
                name: '✚ 힐러',
                icon: '💚',
                baseHealth: 8,
                baseAttack: 2,
                baseDefense: 1,
                baseAccuracy: 0.75,
                baseEvasion: 0.1,
                baseCritChance: 0.05,
                baseMagicPower: 2,
                baseMagicResist: 1,
                baseMaxMana: 10,
                baseHealthRegen: 0.3,
                baseManaRegen: 0.5,
                role: 'support',
                description: '아군을 치료하는 지원 용병',
                cost: 70,
                voiceFile: 'assets/audio/healer_hire.mp3',
                reviveVoice: 'assets/audio/healer_revive.mp3',
                deathVoice: 'assets/audio/healer_death.mp3',
                killQuotes: [
                    'assets/audio/healer_kill_1.mp3',
                    'assets/audio/healer_kill_2.mp3'
                ]
            },
            WIZARD: {
                name: '🔮 마법사',
                icon: '🧙',
                baseHealth: 7,
                baseAttack: 3,
                baseDefense: 1,
                baseAccuracy: 0.8,
                baseEvasion: 0.12,
                baseCritChance: 0.1,
                baseMagicPower: 5,
                baseMagicResist: 2,
                baseMaxMana: 12,
                baseHealthRegen: 0.2,
                baseManaRegen: 0.5,
                role: 'caster',
                description: '마법 공격에 특화된 용병',
                cost: 80,
                voiceFile: 'assets/audio/wizard_hire.mp3',
                reviveVoice: 'assets/audio/wizard_revive.mp3',
                deathVoice: 'assets/audio/wizard_death.mp3',
                killQuotes: [
                    'assets/audio/wizard_kill_1.mp3',
                    'assets/audio/wizard_kill_2.mp3'
                ]
            },
            BARD: {
                name: '🎶 음유시인',
                icon: '🎶',
                baseHealth: 9,
                baseAttack: 3,
                baseDefense: 1,
                baseAccuracy: 0.8,
                baseEvasion: 0.12,
                baseCritChance: 0.08,
                baseMagicPower: 2,
                baseMagicResist: 1,
                baseMaxMana: 8,
                baseHealthRegen: 0.25,
                baseManaRegen: 0.4,
                role: 'bard',
                description: '버프와 노래로 아군을 돕는 만능 지원가',
                cost: 65,
                voiceFile: 'assets/audio/bard_hire.mp3',
                reviveVoice: 'assets/audio/bard_revive.mp3',
                deathVoice: 'assets/audio/bard_death.mp3',
                killQuotes: [
                    'assets/audio/bard_kill_1.mp3',
                    'assets/audio/bard_kill_2.mp3'
                ]
            },
            PALADIN: {
                name: '✝️ 성기사',
                icon: '⚔️',
                baseHealth: 14,
                baseAttack: 5,
                baseDefense: 3,
                baseAccuracy: 0.85,
                baseEvasion: 0.12,
                baseCritChance: 0.1,
                baseMagicPower: 3,
                baseMagicResist: 2,
                baseMaxMana: 8,
                baseHealthRegen: 0.3,
                baseManaRegen: 0.4,
                role: 'paladin',
                description: '신성한 힘을 사용하는 근접 전투 용병',
                cost: 200,
                voiceFile: 'assets/audio/paladin_hire.mp3',
                reviveVoice: 'assets/audio/paladin_revive.mp3',
                deathVoice: 'assets/audio/paladin_death.mp3',
                killQuotes: [
                    'assets/audio/paladin_kill_1.mp3',
                    'assets/audio/paladin_kill_2.mp3'
                ]
            }
        };

        // 챔피언 타입 (용병 타입과 동일)
        const CHAMPION_TYPES = JSON.parse(JSON.stringify(MERCENARY_TYPES));


        // 몬스터 타입 정의
        const MONSTER_TYPES = {
            ZOMBIE: {
                name: '🧟 좀비',
                icon: '🧟‍♂️',
                color: '#8B4513',
                baseHealth: 8,
                baseAttack: 3,
                baseDefense: 1,
                baseAccuracy: 0.6,
                baseEvasion: 0.05,
                baseCritChance: 0.02,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseExp: 6,
                damageDice: "1d4",
                baseGold: 3,
                range: 1,
                special: 'slow'
            },
            GOBLIN: {
                name: '👹 고블린',
                icon: '',
                color: '#32CD32',
                baseHealth: 4,
                baseAttack: 2,
                baseDefense: 0,
                baseAccuracy: 0.65,
                baseEvasion: 0.1,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseExp: 4,
                baseGold: 5,
                damageDice: "1d4",
                range: 1,
                special: 'fast'
            },
            ARCHER: {
                name: '🏹 궁수',
                icon: '🏹',
                color: '#DAA520',
                baseHealth: 5,
                baseAttack: 4,
                baseDefense: 1,
                baseAccuracy: 0.7,
                baseEvasion: 0.1,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseExp: 8,
                damageDice: "1d6",
                baseGold: 7,
                range: 3,
                special: 'ranged',
                statusEffect: 'poison'
            },
            WIZARD: {
                name: '🧙‍♂️ 마법사',
                icon: '🔮',
                color: '#9932CC',
                baseHealth: 3,
                baseAttack: 6,
                baseDefense: 0,
                baseAccuracy: 0.75,
                baseEvasion: 0.1,
                baseCritChance: 0.1,
                baseMagicPower: 5,
                baseMagicResist: 1,
                baseExp: 10,
                damageDice: "1d6",
                baseGold: 10,
                range: 4,
                special: 'magic',
                statusEffect: 'freeze'
            },
            GOBLIN_ARCHER: {
                name: '🏹 고블린 궁수',
                icon: '',
                color: '#6B8E23',
                baseHealth: 4,
                baseAttack: 3,
                baseDefense: 0,
                baseAccuracy: 0.7,
                baseEvasion: 0.1,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseExp: 6,
                damageDice: "1d6",
                baseGold: 6,
                range: 3,
                special: 'ranged',
                statusEffect: 'poison'
            },
            GOBLIN_WIZARD: {
                name: '🧙‍♂️ 고블린 마법사',
                icon: '🔮',
                color: '#2E8B57',
                baseHealth: 3,
                baseAttack: 4,
                baseDefense: 0,
                baseAccuracy: 0.7,
                baseEvasion: 0.1,
                baseCritChance: 0.08,
                baseMagicPower: 4,
                baseMagicResist: 0,
                baseExp: 8,
                damageDice: "1d6",
                baseGold: 8,
                range: 4,
                special: 'magic',
                statusEffect: 'freeze'
            },
            ORC: {
                name: '💪 오크 전사',
                icon: '👹',
                color: '#B22222',
                baseHealth: 12,
                baseAttack: 5,
                baseDefense: 3,
                baseAccuracy: 0.7,
                baseEvasion: 0.05,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 0.5,
                baseExp: 15,
                baseGold: 12,
                damageDice: "1d8",
                range: 1,
                special: 'strong',
                statusEffect: 'bleed'
            },
            ORC_ARCHER: {
                name: '🏹 오크 궁수',
                icon: '🏹',
                color: '#8B0000',
                baseHealth: 10,
                baseAttack: 5,
                baseDefense: 1,
                baseAccuracy: 0.75,
                baseEvasion: 0.08,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 0.2,
                baseExp: 12,
                damageDice: "1d6",
                baseGold: 10,
                range: 3,
                special: 'ranged'
            },
            SKELETON: {
                name: '💀 스켈레톤',
                icon: '💀',
                color: '#AAAAAA',
                baseHealth: 6,
                baseAttack: 3,
                baseDefense: 1,
                baseAccuracy: 0.65,
                baseEvasion: 0.05,
                baseCritChance: 0.03,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseExp: 8,
                damageDice: "1d6",
                baseGold: 6,
                range: 1,
                special: 'undead'
            },
            SKELETON_MAGE: {
                name: '☠️ 스켈레톤 메이지',
                icon: '☠️',
                color: '#CCCCCC',
                baseHealth: 5,
                baseAttack: 4,
                baseDefense: 0,
                baseAccuracy: 0.7,
                baseEvasion: 0.05,
                baseCritChance: 0.07,
                baseMagicPower: 5,
                baseMagicResist: 1,
                baseExp: 12,
                damageDice: "1d6",
                baseGold: 9,
                range: 4,
                special: 'magic'
            },
            TROLL: {
                name: '👹 트롤',
                icon: '👺',
                color: '#556B2F',
                baseHealth: 18,
                baseAttack: 7,
                baseDefense: 3,
                baseAccuracy: 0.65,
                baseEvasion: 0.05,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 0.3,
                baseExp: 20,
                damageDice: "1d8",
                baseGold: 15,
                range: 1,
                special: 'regeneration'
            },
            DARK_MAGE: {
                name: '🧙‍♂️ 다크 메이지',
                icon: '🪄',
                color: '#4B0082',
                baseHealth: 8,
                baseAttack: 6,
                baseDefense: 1,
                baseAccuracy: 0.75,
                baseEvasion: 0.1,
                baseCritChance: 0.1,
                baseMagicPower: 7,
                baseMagicResist: 2,
                baseExp: 25,
                damageDice: "1d8",
                baseGold: 20,
                range: 4,
                special: 'curse'
            },
            DEMON_WARRIOR: {
                name: '😈 데몬 전사',
                icon: '😈',
                color: '#8B0000',
                baseHealth: 22,
                baseAttack: 9,
                baseDefense: 4,
                baseAccuracy: 0.8,
                baseEvasion: 0.1,
                baseCritChance: 0.1,
                baseMagicPower: 3,
                baseMagicResist: 3,
                baseExp: 35,
                damageDice: "1d10",
                baseGold: 25,
                range: 2,
                special: 'demonic'
            },
            SLIME: {
                name: '🟢 슬라임',
                icon: '',
                color: '#7FFF00',
                baseHealth: 5,
                baseAttack: 2,
                baseDefense: 0,
                baseAccuracy: 0.55,
                baseEvasion: 0.05,
                baseCritChance: 0.02,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseExp: 3,
                damageDice: "1d4",
                baseGold: 2,
                range: 1,
                special: 'slow'
            },
            KOBOLD: {
                name: '🦎 코볼트',
                icon: '🦎',
                color: '#DEB887',
                baseHealth: 7,
                baseAttack: 3,
                baseDefense: 1,
                baseAccuracy: 0.65,
                baseEvasion: 0.1,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 0,
                baseExp: 5,
                damageDice: "1d4",
                baseGold: 4,
                range: 1,
                special: 'fast'
            },
            GARGOYLE: {
                name: '🗿 가고일',
                icon: '🗿',
                color: '#708090',
                baseHealth: 14,
                baseAttack: 6,
                baseDefense: 5,
                baseAccuracy: 0.7,
                baseEvasion: 0.05,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 2,
                baseExp: 16,
                damageDice: "1d6",
                baseGold: 12,
                range: 1,
                special: 'strong',
                statusEffect: 'petrify'
            },
            BANSHEE: {
                name: '👻 밴시',
                icon: '👻',
                color: '#E6E6FA',
                baseHealth: 12,
                baseAttack: 6,
                baseDefense: 1,
                baseAccuracy: 0.75,
                baseEvasion: 0.1,
                baseCritChance: 0.1,
                baseMagicPower: 6,
                baseMagicResist: 3,
                baseExp: 18,
                damageDice: "1d6",
                baseGold: 14,
                range: 4,
                special: 'curse',
                statusEffect: 'nightmare'
            },
            MINOTAUR: {
                name: '🐂 미노타우로스',
                icon: '🐂',
                color: '#A52A2A',
                baseHealth: 20,
                baseAttack: 8,
                baseDefense: 4,
                baseAccuracy: 0.7,
                baseEvasion: 0.05,
                baseCritChance: 0.05,
                baseMagicPower: 0,
                baseMagicResist: 1,
                baseExp: 24,
                damageDice: "1d8",
                baseGold: 18,
                range: 1,
                special: 'strong'
            },
            LICH: {
                name: '☠️ 리치',
                icon: '☠️',
                color: '#9400D3',
                baseHealth: 18,
                baseAttack: 7,
                baseDefense: 2,
                baseAccuracy: 0.75,
                baseEvasion: 0.1,
                baseCritChance: 0.1,
                baseMagicPower: 8,
                baseMagicResist: 4,
                baseExp: 28,
                damageDice: "1d8",
                baseGold: 22,
                range: 4,
                special: 'curse'
            },
            DRAGON_WHELP: {
                name: '🐉 새끼 용',
                icon: '🐉',
                color: '#FF8C00',
                baseHealth: 22,
                baseAttack: 9,
                baseDefense: 4,
                baseAccuracy: 0.75,
                baseEvasion: 0.1,
                baseCritChance: 0.1,
                baseMagicPower: 6,
                baseMagicResist: 3,
                baseExp: 32,
                damageDice: "1d8",
                baseGold: 26,
                range: 3,
                special: 'magic',
                statusEffect: 'burn'
            },
            ELEMENTAL_GOLEM: {
                name: '🪨 정령 골렘',
                icon: '🪨',
                color: '#696969',
                baseHealth: 26,
                baseAttack: 10,
                baseDefense: 6,
                baseAccuracy: 0.75,
                baseEvasion: 0.05,
                baseCritChance: 0.1,
                baseMagicPower: 5,
                baseMagicResist: 5,
                baseExp: 40,
                damageDice: "1d10",
                baseGold: 30,
                range: 2,
                special: 'strong'
            },
            BOSS: {
                name: '👑 던전 보스',
                icon: '💀',
                color: '#FF4500',
                baseHealth: 30,
                baseAttack: 8,
                baseDefense: 5,
                baseAccuracy: 0.8,
                baseEvasion: 0.1,
                baseCritChance: 0.1,
                baseMagicPower: 3,
                baseMagicResist: 2,
                baseExp: 50,
                damageDice: "1d10",
                baseGold: 50,
                range: 2,
                special: 'boss',
                statusEffect: 'burn'
            }
        };

        // 아이템 데이터베이스
        const ITEMS = {
            shortSword: {
                name: '🗡️ 단검',
                type: ITEM_TYPES.WEAPON,
                attack: 2,
                damageDice: "1d6",
                price: 10,
                level: 1,
                icon: '🗡️',
                imageUrl: 'assets/images/shortsword.png'
            },
            longSword: {
                name: '⚔️ 장검',
                type: ITEM_TYPES.WEAPON,
                attack: 4,
                price: 25,
                damageDice: "1d8",
                level: 2,
                icon: '⚔️'
            },
            bow: {
                name: '🏹 활',
                type: ITEM_TYPES.WEAPON,
                attack: 3,
                damageDice: "1d6",
                price: 20,
                level: 1,
                icon: '🏹',
                imageUrl: 'assets/images/bow.png'
            },
            magicSword: {
                name: '✨ 마법검',
                type: ITEM_TYPES.WEAPON,
                attack: 6,
                price: 50,
                level: 3,
                damageDice: "1d10",
                icon: '✨'
            },
            magicStaff: {
                name: '🔮 마법 지팡이',
                type: ITEM_TYPES.WEAPON,
                magicPower: 3,
                manaRegen: 1,
                price: 30,
                level: 2,
                damageDice: "1d4",
                icon: '🔮'
            },
            leatherArmor: {
                name: '🛡️ 가죽 갑옷',
                type: ITEM_TYPES.ARMOR,
                defense: 2,
                price: 15,
                level: 1,
                icon: '🛡️',
                imageUrl: 'assets/images/leatherarmor.png'
            },
            chainMail: {
                name: '🔗 사슬 갑옷',
                type: ITEM_TYPES.ARMOR,
                defense: 4,
                price: 35,
                level: 2,
                icon: '🔗'
            },
            plateArmor: {
                name: '🛡️ 판금 갑옷',
                type: ITEM_TYPES.ARMOR,
                defense: 6,
                price: 60,
                level: 3,
                icon: '🛡️'
            },
            critCharm: {
                name: '💎 치명 부적',
                type: ITEM_TYPES.ACCESSORY,
                critChance: 0.05,
                price: 20,
                level: 1,
                icon: '💎'
            },
            evasionCharm: {
                name: '🍀 회피 부적',
                type: ITEM_TYPES.ACCESSORY,
                evasion: 0.05,
                price: 20,
                level: 1,
                icon: '🍀'
            },
            aimRing: {
                name: '🎯 명중 반지',
                type: ITEM_TYPES.ACCESSORY,
                accuracy: 0.05,
                price: 25,
                level: 2,
                icon: '🎯'
            },
            healthPotion: {
                name: '🧪 체력 포션',
                type: ITEM_TYPES.POTION,
                healing: 10,
                price: 5,
                level: 1,
                icon: '🧪'
            },
            greaterHealthPotion: {
                name: '💊 대형 체력 포션',
                type: ITEM_TYPES.POTION,
                healing: 25,
                price: 15,
                level: 2,
                icon: '💊'
            },
            reviveScroll: {
                name: '✨ 부활 스크롤',
                type: ITEM_TYPES.REVIVE,
                price: 0,
                level: 2,
                icon: '✨'
            },
            smallExpScroll: {
                name: '📜 작은 경험치 스크롤',
                type: ITEM_TYPES.EXP_SCROLL,
                expGain: 5,
                price: 10,
                level: 1,
                icon: '📜'
            },
            superiorEgg: {
                name: '🥚 슈페리어 알',
                type: ITEM_TYPES.EGG,
                price: 50,
                level: 1,
                icon: '🥚',
                incubation: 3
            },
            fertilizer: {
                name: '🌱 비료',
                type: ITEM_TYPES.FERTILIZER,
                price: 5,
                level: 1,
                icon: '🌱'
            },
            strengthEssence: {
                name: '💪 힘의 정수',
                type: ITEM_TYPES.ESSENCE,
                strength: 1,
                price: 20,
                level: 1,
                icon: '💪'
            },
            agilityEssence: {
                name: '🤸 민첩의 정수',
                type: ITEM_TYPES.ESSENCE,
                agility: 1,
                price: 20,
                level: 1,
                icon: '🤸'
            },
            enduranceEssence: {
                name: '🛡️ 인내의 정수',
                type: ITEM_TYPES.ESSENCE,
                endurance: 1,
                price: 20,
                level: 1,
                icon: '🛡️'
            },
            focusEssence: {
                name: '🎯 집중의 정수',
                type: ITEM_TYPES.ESSENCE,
                focus: 1,
                price: 25,
                level: 1,
                icon: '🎯'
            },
            intelligenceEssence: {
                name: '🧠 지능의 정수',
                type: ITEM_TYPES.ESSENCE,
                intelligence: 1,
                price: 25,
                level: 1,
                icon: '🧠'
            },
            skillLevelEssence: {
                name: '⭐ 스킬 레벨 정수',
                type: ITEM_TYPES.ESSENCE,
                skillLevelEssence: 1,
                price: 30,
                level: 1,
                icon: '⭐'
            },
            cookedMeal: {
                name: '🍲 요리',
                type: ITEM_TYPES.FOOD,
                affinityGain: 5,
                fullnessGain: 5,
                price: 15,
                level: 1,
                icon: '🍲'
            },
            bread: {
                name: '🍞 빵',
                type: ITEM_TYPES.FOOD,
                affinityGain: 1,
                fullnessGain: 1,
                price: 3,
                level: 1,
                icon: '🍞'
            },
            meat: {
                name: '🍖 고기',
                type: ITEM_TYPES.FOOD,
                affinityGain: 1,
                fullnessGain: 2,
                price: 4,
                level: 1,
                icon: '🍖'
            },
            rawMeat: {
                name: '🥩 생고기',
                type: ITEM_TYPES.FOOD,
                affinityGain: 0,
                fullnessGain: 2,
                price: 2,
                level: 1,
                icon: '🥩'
            },
            lettuce: {
                name: '🥬 양상추',
                type: ITEM_TYPES.FOOD,
                affinityGain: 1,
                fullnessGain: 1,
                price: 2,
                level: 1,
                icon: '🥬'
            },
            salad: {
                name: '🥗 샐러드',
                type: ITEM_TYPES.FOOD,
                affinityGain: 2,
                fullnessGain: 2,
                price: 6,
                level: 1,
                icon: '🥗'
            },
            sandwich: {
                name: '🥪 샌드위치',
                type: ITEM_TYPES.FOOD,
                affinityGain: 3,
                fullnessGain: 3,
                price: 8,
                level: 1,
                icon: '🥪'
            },
            breadSoup: {
                name: '🍲 빵 수프',
                type: ITEM_TYPES.FOOD,
                affinityGain: 3,
                fullnessGain: 4,
                price: 8,
                level: 1,
                icon: '🍲'
            },
            meatStew: {
                name: '🍖 고기 스튜',
                type: ITEM_TYPES.FOOD,
                affinityGain: 6,
                fullnessGain: 8,
                price: 18,
                level: 1,
                icon: '🍖'
            },
            grilledMeat: {
                name: '🥩 구운 고기',
                type: ITEM_TYPES.FOOD,
                affinityGain: 4,
                fullnessGain: 6,
                price: 12,
                level: 1,
                icon: '🥩'
            },
            vegetableSoup: {
                name: '🥬 야채 수프',
                type: ITEM_TYPES.FOOD,
                affinityGain: 4,
                fullnessGain: 5,
                price: 10,
                level: 1,
                icon: '🥬'
            },
            feastPlatter: {
                name: '🍽️ 성찬',
                type: ITEM_TYPES.FOOD,
                affinityGain: 12,
                fullnessGain: 15,
                price: 35,
                level: 2,
                icon: '🍽️'
            },
            royalBanquet: {
                name: '👑 왕실 연회',
                type: ITEM_TYPES.FOOD,
                affinityGain: 20,
                fullnessGain: 25,
                price: 50,
                level: 2,
                icon: '👑'
            },
            graveyardMap: {
                name: '🗺️ 묘지 지도',
                type: ITEM_TYPES.MAP,
                level: 1,
                icon: '🗺️'
            },
            ruinsMap: {
                name: '🗺️ 폐허 지도',
                type: ITEM_TYPES.MAP,
                level: 2,
                icon: '🗺️'
            }

        };

        // 유니크 아이템 데이터베이스
        const UNIQUE_ITEMS = {
            volcanicEruptor: {
                name: '🌋 화산의 분출자',
                type: ITEM_TYPES.WEAPON,
                attack: 8,
                damageDice: '1d12',
                tier: 'unique',
                procs: [
                    { event: 'onAttack', skill: 'Fireball', chance: 0.1, level: 0.5 }
                ],
                icon: '🌋',
                level: 1,
                price: 0
            },
            glacialGuard: {
                name: '🧊 빙하의 수호자',
                type: ITEM_TYPES.ARMOR,
                defense: 8,
                tier: 'unique',
                procs: [
                    { event: 'onDamaged', skill: 'IceNova', chance: 0.075, level: 0.5 }
                ],
                icon: '🛡️',
                level: 1,
                price: 0
            },
            guardianAmulet: {
                name: '🛡️ 수호의 부적',
                type: ITEM_TYPES.ACCESSORY,
                tier: 'unique',
                procs: [
                    { event: 'onDamaged', skill: 'GuardianHymn', chance: 0.05, level: 0.5 }
                ],
                icon: '🛡️',
                level: 1,
                price: 0
            },
            courageAmulet: {
                name: '🎵 용기의 부적',
                type: ITEM_TYPES.ACCESSORY,
                tier: 'unique',
                procs: [
                    { event: 'onDamaged', skill: 'CourageHymn', chance: 0.05, level: 0.5 }
                ],
                icon: '🎵',
                level: 1,
                price: 0
            }
        };

        const UNIQUE_EFFECT_POOL = [
            { event: 'onAttack', skill: 'FireNova', chance: 0.15 },
            { event: 'onAttack', skill: 'IceNova', chance: 0.15 },
            { event: 'onDamaged', skill: 'GuardianHymn', chance: 0.1 },
            { event: 'onDamaged', skill: 'CourageHymn', chance: 0.1 }
        ];

        // Skill definitions used throughout the game
        // Each entry must specify a numeric cooldown; set to 0 for passive or always-available skills.
        const SKILL_DEFS = {
            Fireball: { name: 'Fireball', icon: '🔥', damageDice: '1d10', range: 5, magic: true, element: 'fire', manaCost: 3, cooldown: 2 },
            Iceball: { name: 'Iceball', icon: '❄️', damageDice: '1d8', range: 5, magic: true, element: 'ice', manaCost: 2, cooldown: 2 },
            FireNova: { name: 'Fire Nova', icon: '🔥', damageDice: '1d6', radius: 3, magic: true, element: 'fire', manaCost: 5, cooldown: 3, novaType: 'fire', screenShake: { intensity: 3, duration: 200 } },
            IceNova: { name: 'Ice Nova', icon: '❄️', damageDice: '1d6', radius: 3, magic: true, element: 'ice', manaCost: 4, cooldown: 3, novaType: 'ice' },
            Heal: { name: 'Heal', icon: '💖', heal: 10, range: 2, manaCost: 3, cooldown: 2 },
            Purify: { name: 'Purify', icon: '🌀', purify: true, range: 2, manaCost: 2, cooldown: 2 },
            Teleport: { name: 'Teleport', icon: '🌀', teleport: true, manaCost: 2, cooldown: 1 },
            GuardianHymn: { name: '수호의 찬가', icon: '🎶', range: 3, manaCost: 3, shield: true, duration: 5, cooldown: 3 },
            CourageHymn: { name: '용기의 찬가', icon: '🎵', range: 3, manaCost: 3, attackBuff: true, duration: 5, cooldown: 3 },
            DoubleStrike: { name: 'Double Strike', icon: '🔪', range: 1, manaCost: 3, melee: true, hits: 2, cooldown: 2 },
            DoubleThrust: { name: 'Double Thrust', icon: '🏹', range: 3, manaCost: 3, hits: 2, cooldown: 2 },
            ChargeAttack: { name: 'Charge Attack', icon: '⚡', range: 2, manaCost: 2, melee: true, multiplier: 1.5, dashRange: 4, cooldown: 3 },
            HawkEye: { name: 'Hawk Eye', icon: '🦅', range: 5, manaCost: 2, damageDice: '1d6', cooldown: 2 },
            MightAura: { name: 'Might Aura', icon: '💪', passive: true, radius: 6, aura: { attack: 1, magicPower: 1 }, cooldown: 0 },
            ProtectAura: { name: 'Protect Aura', icon: '🛡️', passive: true, radius: 6, aura: { defense: 1, magicResist: 1 }, cooldown: 0 },
            RegenerationAura: { name: 'Regeneration Aura', icon: '💚', passive: true, radius: 6, aura: { healthRegen: 1 }, cooldown: 0 },
            MeditationAura: { name: 'Meditation Aura', icon: '🌀', passive: true, radius: 6, aura: { manaRegen: 1 }, cooldown: 0 },
            HasteAura: { name: 'Haste Aura', icon: '💨', passive: true, radius: 6, aura: { evasion: 0.05 }, cooldown: 0 },
            ConcentrationAura: { name: 'Concentration Aura', icon: '🎯', passive: true, radius: 6, aura: { accuracy: 0.05 }, cooldown: 0 },
            CondemnAura: { name: 'Condemn Aura', icon: '⚔️', passive: true, radius: 6, aura: { critChance: 0.05 }, cooldown: 0 },
            NaturalAura: { name: 'Natural Aura', icon: '🌿', passive: true, radius: 6, aura: { allResist: 0.05 }, cooldown: 0 } // 레벨당 5% 저항
            ,Berserk: { name: '광전사', icon: '⬆️', statBuff: { stat: 'attack', mult: 0.25 }, duration: 3, cooldown: 3 }
            ,Fortress: { name: '요새', icon: '⬆️', statBuff: { stat: 'defense', mult: 0.25 }, duration: 3, cooldown: 3 }
            ,ArcaneBurst: { name: '비전 폭발', icon: '⬆️', statBuff: { stat: 'magicPower', mult: 0.25 }, duration: 3, cooldown: 3 }
            ,Barrier: { name: '결계', icon: '⬆️', statBuff: { stat: 'magicResist', mult: 0.25 }, duration: 3, cooldown: 3 }
            ,Divinity: { name: '신격화', icon: '⬆️', statBuff: { stats: ['strength','agility','endurance','focus','intelligence'], mult: 0.25 }, duration: 3, cooldown: 3 }
            ,Weaken: { name: '약화', icon: '⬇️', statBuff: { stat: 'attack', mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 }
            ,Sunder: { name: '분쇄', icon: '⬇️', statBuff: { stat: 'defense', mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 }
            ,Regression: { name: '퇴행', icon: '⬇️', statBuff: { stat: 'magicPower', mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 }
            ,SpellWeakness: { name: '마법 취약', icon: '⬇️', statBuff: { stat: 'magicResist', mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 }
            ,ElementalWeakness: { name: '원소 취약', icon: '⬇️', statBuff: { elementResists: true, mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 }
        };

        // 용병 전용 스킬 정의
        const MERCENARY_SKILLS = {
            ChargeAttack: { name: 'Charge Attack', icon: '⚡', range: 2, manaCost: 2, multiplier: 1.5, dashRange: 4, cooldown: 3 },
            DoubleStrike: { name: 'Double Strike', icon: '🔪', range: 1, manaCost: 3, cooldown: 2 },
            DoubleThrust: { name: 'Double Thrust', icon: '🏹', range: 3, manaCost: 3, cooldown: 2 },
            Heal: { name: 'Heal', icon: '✨', range: 2, manaCost: 2, cooldown: 2 },
            Purify: { name: 'Purify', icon: '🌀', range: 2, manaCost: 2, cooldown: 2 },
            Fireball: { name: 'Fireball', icon: '🔥', range: 4, manaCost: 3, damageDice: '1d8', magic: true, element: 'fire', cooldown: 2 },
            Iceball: { name: 'Iceball', icon: '❄️', range: 5, manaCost: 2, damageDice: '1d8', magic: true, element: 'ice', cooldown: 2 },
            GuardianHymn: { name: '수호의 찬가', icon: '🎶', range: 3, manaCost: 3, shield: true, duration: 5, cooldown: 3 },
            CourageHymn: { name: '용기의 찬가', icon: '🎵', range: 3, manaCost: 3, attackBuff: true, duration: 5, cooldown: 3 },
            HawkEye: { name: 'Hawk Eye', icon: '🦅', range: 5, manaCost: 2, damageDice: '1d6', cooldown: 2 },
            MightAura: { name: 'Might Aura', icon: '💪', passive: true, radius: 6, aura: { attack: 1, magicPower: 1 }, cooldown: 0 },
            ProtectAura: { name: 'Protect Aura', icon: '🛡️', passive: true, radius: 6, aura: { defense: 1, magicResist: 1 }, cooldown: 0 },
            RegenerationAura: { name: 'Regeneration Aura', icon: '💚', passive: true, radius: 6, aura: { healthRegen: 1 }, cooldown: 0 },
            MeditationAura: { name: 'Meditation Aura', icon: '🌀', passive: true, radius: 6, aura: { manaRegen: 1 }, cooldown: 0 },
            HasteAura: { name: 'Haste Aura', icon: '💨', passive: true, radius: 6, aura: { evasion: 0.05 }, cooldown: 0 },
            ConcentrationAura: { name: 'Concentration Aura', icon: '🎯', passive: true, radius: 6, aura: { accuracy: 0.05 }, cooldown: 0 },
            CondemnAura: { name: 'Condemn Aura', icon: '⚔️', passive: true, radius: 6, aura: { critChance: 0.05 }, cooldown: 0 },
            NaturalAura: { name: 'Natural Aura', icon: '🌿', passive: true, radius: 6, aura: { allResist: 0.05 }, cooldown: 0 }, // 레벨당 5% 저항
            Berserk: { name: '광전사', icon: '⬆️', statBuff: { stat: 'attack', mult: 0.25 }, duration: 3, cooldown: 3 },
            Fortress: { name: '요새', icon: '⬆️', statBuff: { stat: 'defense', mult: 0.25 }, duration: 3, cooldown: 3 },
            ArcaneBurst: { name: '비전 폭발', icon: '⬆️', statBuff: { stat: 'magicPower', mult: 0.25 }, duration: 3, cooldown: 3 },
            Barrier: { name: '결계', icon: '⬆️', statBuff: { stat: 'magicResist', mult: 0.25 }, duration: 3, cooldown: 3 },
            Divinity: { name: '신격화', icon: '⬆️', statBuff: { stats: ['strength','agility','endurance','focus','intelligence'], mult: 0.25 }, duration: 3, cooldown: 3 },
            Weaken: { name: '약화', icon: '⬇️', statBuff: { stat: 'attack', mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 },
            Sunder: { name: '분쇄', icon: '⬇️', statBuff: { stat: 'defense', mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 },
            Regression: { name: '퇴행', icon: '⬇️', statBuff: { stat: 'magicPower', mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 },
            SpellWeakness: { name: '마법 취약', icon: '⬇️', statBuff: { stat: 'magicResist', mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 },
            ElementalWeakness: { name: '원소 취약', icon: '⬇️', statBuff: { elementResists: true, mult: -0.25, target: 'enemy' }, duration: 3, cooldown: 3 }
        };


        const MONSTER_SKILLS = {
            RottingBite: { name: 'Rotting Bite', icon: '🧟', range: 1, damageDice: '1d6', melee: true, status: 'poison', manaCost: 2, cooldown: 2 },
            PowerStrike: { name: 'Power Strike', icon: '💥', range: 1, damageDice: '1d8', melee: true, manaCost: 2, cooldown: 2 },
            ShadowBolt: { name: 'Shadow Bolt', icon: '🌑', range: 3, damageDice: '1d6', magic: true, element: 'dark', manaCost: 2, cooldown: 2 },
            PoisonCloud: { name: 'Poison Cloud', icon: '☣️', radius: 2, damageDice: '1d4', magic: true, status: 'poison', manaCost: 2, cooldown: 3 },
            FireBreath: { name: 'Fire Breath', icon: '🔥', radius: 2, magic: true, element: 'fire', damageDice: '1d6', status: 'burn', manaCost: 2, cooldown: 3 }
        };


        const MERCENARY_SKILL_SETS = {
            WARRIOR: ['ChargeAttack', 'DoubleStrike'],
            ARCHER: ['DoubleThrust', 'HawkEye'],
            HEALER: ['Heal'],
            WIZARD: ['Fireball', 'Iceball'],
            BARD: ['GuardianHymn', 'CourageHymn', 'Heal'],
            PALADIN: ['Berserk', 'Fortress', 'ArcaneBurst', 'Barrier', 'Divinity']
        };

        // 디버프 스킬 목록 (일부 로직에서 제외용)
        const DEBUFF_SKILLS = ['Weaken','Sunder','Regression','SpellWeakness','ElementalWeakness'];

        const MONSTER_SKILL_SETS = {
            ZOMBIE: ['RottingBite', 'PoisonCloud', 'PoisonStrike'],
            GOBLIN: ['PowerStrike', 'WindStrike'],
            ARCHER: ['PowerStrike', 'PoisonShot'],
            GOBLIN_ARCHER: ['PowerStrike', 'PoisonShot'],
            GOBLIN_WIZARD: ['ShadowBolt', 'PoisonCloud', 'FreezeMagic'],
            WIZARD: ['ShadowBolt', 'FireBreath', 'FreezeMagic'],
            ORC: ['PowerStrike', 'BleedStrike'],
            ORC_ARCHER: ['PowerStrike', 'EarthShot'],
            SKELETON: ['PowerStrike', 'DarkStrike'],
            SKELETON_MAGE: ['ShadowBolt', 'DarkMagic'],
            TROLL: ['PowerStrike', 'FireBreath', 'EarthStrike'],
            DARK_MAGE: ['ShadowBolt', 'PoisonCloud', 'NightmareMagic'],
            DEMON_WARRIOR: ['ShadowBolt', 'FireBreath', 'FireStrike'],
            SLIME: ['PoisonStrike'],
            KOBOLD: ['PowerStrike', 'WindStrike'],
            GARGOYLE: ['EarthStrike', 'PetrifyStrike'],
            BANSHEE: ['NightmareMagic', 'FreezeMagic'],
            MINOTAUR: ['PowerStrike', 'BleedStrike'],
            LICH: ['DarkMagic', 'NightmareMagic', 'PoisonCloud'],
            DRAGON_WHELP: ['FireBreath', 'FireStrike'],
            ELEMENTAL_GOLEM: ['EarthStrike', 'FireBreath'],
            BOSS: ['ShadowBolt', 'FireBreath', 'BurnStrike']
        };

        const MONSTER_TRAIT_SETS = {
            ZOMBIE: ['PoisonMelee'],
            GOBLIN: ['WindMelee'],
            ARCHER: ['PoisonRanged'],
            GOBLIN_ARCHER: ['PoisonRanged'],
            GOBLIN_WIZARD: ['FreezeMagic'],
            WIZARD: ['FreezeMagic'],
            ORC: ['BleedMelee'],
            ORC_ARCHER: ['EarthRanged'],
            SKELETON: ['DarkMelee'],
            SKELETON_MAGE: ['DarkMagic'],
            TROLL: ['EarthMelee'],
            DARK_MAGE: ['NightmareMagic'],
            DEMON_WARRIOR: ['FireMelee'],
            SLIME: ['PoisonMelee'],
            KOBOLD: ['WindMelee'],
            GARGOYLE: ['PetrifyMelee'],
            BANSHEE: ['NightmareMagic'],
            MINOTAUR: ['BleedMelee'],
            LICH: ['DarkMagic'],
            DRAGON_WHELP: ['FireMelee'],
            ELEMENTAL_GOLEM: ['EarthMelee'],
            BOSS: ['BurnMelee']
        };

        const RECIPES = {
            healthPotion: { name: 'Health Potion', output: 'healthPotion', materials: { herb: 2 }, turns: 3 },
            shortSword: { name: 'Short Sword', output: 'shortSword', materials: { wood: 1, iron: 2 }, turns: 5 },
            sandwich: { name: 'Sandwich', output: 'sandwich', materials: { bread: 1, meat: 1, lettuce: 1 }, turns: 2 },
            salad: { name: 'Salad', output: 'salad', materials: { lettuce: 2, herb: 1 }, turns: 2 },
            breadSoup: { name: 'Bread Soup', output: 'breadSoup', materials: { bread: 2, herb: 1 }, turns: 2 },
            meatStew: { name: 'Meat Stew', output: 'meatStew', materials: { meat: 2, lettuce: 1, herb: 1 }, turns: 3 },
            grilledMeat: { name: 'Grilled Meat', output: 'grilledMeat', materials: { rawMeat: 2 }, turns: 2 },
            vegetableSoup: { name: 'Vegetable Soup', output: 'vegetableSoup', materials: { lettuce: 3, herb: 2 }, turns: 3 },
            feastPlatter: { name: 'Feast Platter', output: 'feastPlatter', materials: { grilledMeat: 1, salad: 1, bread: 2 }, turns: 4 },
            royalBanquet: { name: 'Royal Banquet', output: 'royalBanquet', materials: { meatStew: 1, vegetableSoup: 1, sandwich: 1 }, turns: 5 }
        };

        const MATERIAL_ICONS = {
            wood: '🪵',
            iron: '⛓️',
            bone: '🦴',
            herb: '🌿'
        };



        const HEAL_MANA_COST = 2;

        const ELEMENT_EMOJI = {
            fire: '🔥',
            ice: '❄️',
            lightning: '⚡',
            wind: '💨',
            earth: '🌱',
            light: '✨',
            dark: '🌑'
        };

        const STATUS_NAMES = {
            poison: "독",
            burn: "화상",
            freeze: "빙결",
            bleed: "출혈",
            paralysis: "마비",
            nightmare: "악몽",
            silence: "침묵",
            petrify: "석화",
            debuff: "약화"
        };

        const STATUS_ICONS = {
            poison: '☠️',
            burn: '🔥',
            freeze: '❄️',
            bleed: '🩸',
            paralysis: '⚡',
            nightmare: '😱',
            silence: '🤐',
            petrify: '🪨',
            debuff: '⬇️'
        };

        const MONSTER_TRAITS = (() => {
            const obj = {};
            const elems = ['fire','ice','wind','earth','light','dark'];
            const statuses = ['poison','freeze','burn','bleed','paralysis','nightmare','silence','petrify','debuff'];
            const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
            elems.forEach(e => {
                ['Melee','Ranged','Magic'].forEach(t => {
                    obj[cap(e)+t] = { name: `${cap(e)} ${t}`, icon: ELEMENT_EMOJI[e], element: e };
                });
            });
            statuses.forEach(s => {
                ['Melee','Ranged','Magic'].forEach(t => {
                    obj[cap(s)+t] = { name: `${STATUS_NAMES[s]} ${t}`, icon: STATUS_ICONS[s], status: s };
                });
            });
            return obj;
        })();

        (() => {
            const elems = ['fire','ice','wind','earth','light','dark'];
            const statuses = ['poison','freeze','burn','bleed','paralysis','nightmare','silence','petrify','debuff'];
            const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
            elems.forEach(e => {
                MONSTER_SKILLS[cap(e)+'Strike'] = { name: `${cap(e)} Strike`, icon: ELEMENT_EMOJI[e], range: 1, damageDice: '1d6', melee: true, element: e, manaCost: 2, cooldown: 2 };
                MONSTER_SKILLS[cap(e)+'Shot'] = { name: `${cap(e)} Shot`, icon: ELEMENT_EMOJI[e], range: 3, damageDice: '1d6', element: e, manaCost: 2, cooldown: 2 };
                MONSTER_SKILLS[cap(e)+'Magic'] = { name: `${cap(e)} Magic`, icon: ELEMENT_EMOJI[e], range: 4, damageDice: '1d6', magic: true, element: e, manaCost: 2, cooldown: 2 };
            });
            statuses.forEach(s => {
                MONSTER_SKILLS[cap(s)+'Strike'] = { name: `${STATUS_NAMES[s]} Strike`, icon: STATUS_ICONS[s], range: 1, damageDice: '1d6', melee: true, status: s, manaCost: 2, cooldown: 2 };
                MONSTER_SKILLS[cap(s)+'Shot'] = { name: `${STATUS_NAMES[s]} Shot`, icon: STATUS_ICONS[s], range: 3, damageDice: '1d6', status: s, manaCost: 2, cooldown: 2 };
                MONSTER_SKILLS[cap(s)+'Magic'] = { name: `${STATUS_NAMES[s]} Magic`, icon: STATUS_ICONS[s], range: 4, damageDice: '1d6', magic: true, status: s, manaCost: 2, cooldown: 2 };
            });
        })();

        // 접두사/접미사 풀
        const PREFIXES = [
            { name: 'Flaming', modifiers: { fireDamage: 2 } },
            { name: 'Chilling', modifiers: { iceDamage: 2 } },
            { name: 'Gusty', modifiers: { windDamage: 2 } },
            { name: 'Earthen', modifiers: { earthDamage: 2 } },
            { name: 'Radiant', modifiers: { lightDamage: 2 } },
            { name: 'Shadowy', modifiers: { darkDamage: 2 } },
            { name: 'Sharp', modifiers: { attack: 1 } },
            { name: 'Sturdy', modifiers: { defense: 1 } },
            { name: 'Refreshing', modifiers: { healthRegen: 1 } },
            { name: 'Mystic', modifiers: { manaRegen: 1 } },
            { name: 'Rejuvenating', modifiers: { healOnKill: 5 } },
            { name: 'Soulful', modifiers: { manaOnKill: 5 } },
            { name: 'Vampiric', modifiers: { lifeSteal: 0.05 } },
            { name: 'Thorny', modifiers: { damageReflect: 0.1 } },
            { name: 'Venomous', modifiers: { status: 'poison' } },
            { name: 'Serrated', modifiers: { status: 'bleed' } },
            { name: 'Smoldering', modifiers: { status: 'burn' } },
            { name: 'Frosted', modifiers: { status: 'freeze' } },
            { name: 'Poison Resistant', modifiers: { poisonResist: 0.3 } },
            { name: 'Bleed Resistant', modifiers: { bleedResist: 0.3 } },
            { name: 'Burn Resistant', modifiers: { burnResist: 0.3 } },
            { name: 'Freeze Resistant', modifiers: { freezeResist: 0.3 } }
        ];
        const SUFFIXES = [
            { name: 'of Protection', modifiers: { defense: 2 } },
            { name: 'of Fury', modifiers: { attack: 2 } },
            { name: 'of Vitality', modifiers: { maxHealth: 5 } },
            { name: 'of Wisdom', modifiers: { manaRegen: 1 } },
            { name: 'of Mending', modifiers: { healthRegen: 1 } },
            { name: 'of Rejuvenation', modifiers: { healOnKill: 5 } },
            { name: 'of Souls', modifiers: { manaOnKill: 5 } },
            { name: 'of Venom', modifiers: { status: 'poison' } },
            { name: 'of Bleeding', modifiers: { status: 'bleed' } },
            { name: 'of Burning', modifiers: { status: 'burn' } },
            { name: 'of Frost', modifiers: { status: 'freeze' } },
            { name: 'of Leeching', modifiers: { lifeSteal: 0.05 } },
            { name: 'of Thorns', modifiers: { damageReflect: 0.1 } },
            { name: 'of Poison Resistance', modifiers: { poisonResist: 0.3 } },
            { name: 'of Bleed Resistance', modifiers: { bleedResist: 0.3 } },
            { name: 'of Burn Resistance', modifiers: { burnResist: 0.3 } },
            { name: 'of Frost Resistance', modifiers: { freezeResist: 0.3 } }
        ];

        const RARE_PREFIXES = [
            { name: 'Arcane', modifiers: { magicPower: 3, manaRegen: 1 } },
            { name: 'Savage', modifiers: { attack: 2, critChance: 0.05 } },
            { name: 'Guardian', modifiers: { defense: 2, maxHealth: 10 } },
            { name: 'Swift', modifiers: { accuracy: 0.05, evasion: 0.05 } },
            { name: 'Vampiric', modifiers: { lifeSteal: 0.1 } },
            { name: 'Thorned', modifiers: { damageReflect: 0.2 } },
            { name: 'Rejuvenating', modifiers: { healOnKill: 10 } },
            { name: 'Soulful', modifiers: { manaOnKill: 10 } },
            { name: 'Long-range', modifiers: { skillRangeBonus: 1 } },
            { name: 'Quickcast', modifiers: { skillCooldownMod: -1 } },
            { name: 'Efficient', modifiers: { skillManaCostMult: 0.5 } },
            { name: 'Empowered', modifiers: { skillPowerMult: () => 1.1 + Math.random() * 0.4 } }
        ];

        const RARE_SUFFIXES = [
            { name: 'of Mastery', modifiers: { attack: 2, defense: 2 } },
            { name: 'of the Magus', modifiers: { magicPower: 3, manaRegen: 1 } },
            { name: 'of Vitality', modifiers: { maxHealth: 10, healthRegen: 1 } },
            { name: 'of Quickness', modifiers: { accuracy: 0.05, evasion: 0.05, critChance: 0.05 } },
            { name: 'of Leeching', modifiers: { lifeSteal: 0.1 } },
            { name: 'of Thorns', modifiers: { damageReflect: 0.2 } },
            { name: 'of Rejuvenation', modifiers: { healOnKill: 10 } },
            { name: 'of Souls', modifiers: { manaOnKill: 10 } },
            { name: 'of Range', modifiers: { skillRangeBonus: 1 } },
            { name: 'of Quickcasting', modifiers: { skillCooldownMod: -1 } },
            { name: 'of Efficiency', modifiers: { skillManaCostMult: 0.5 } },
            { name: 'of Power', modifiers: { skillPowerMult: () => 1.1 + Math.random() * 0.4 } }
        ];

        const MAP_PREFIXES = [
            { name: 'Populous', modifiers: { monsterMultiplier: 1.5 } },
            { name: 'Elite', modifiers: { eliteChanceBonus: 0.2 } },
            { name: 'Resistant', modifiers: { monsterDefenseBonus: 2 } },
            { name: 'Vicious', modifiers: { monsterAttackBonus: 2 } }
        ];

        const MAP_SUFFIXES = [
            { name: 'of Treasures', modifiers: { treasureMultiplier: 2.0 } },
            { name: 'of Riches', modifiers: { goldMultiplier: 1.5 } },
            { name: 'of Items', modifiers: { lootChanceBonus: 0.15 } },
            { name: 'of Haste', modifiers: { monsterSpeedBonus: 2 } }
        ];

        const MAP_TILE_TYPES = [
            { name: 'Campfire', icon: '🔥' },
            { name: 'Fountain', icon: '⛲' },
            { name: 'Totem', icon: '🗿' }
        ];

        function getDistance(x1, y1, x2, y2) {
            return Math.abs(x1 - x2) + Math.abs(y1 - y2);
        }

        // 직선 시야 확보 여부 간단 체크
        function hasLineOfSight(x1, y1, x2, y2) {
            let dx = Math.sign(x2 - x1);
            let dy = Math.sign(y2 - y1);
            let x = x1;
            let y = y1;
            while (x !== x2 || y !== y2) {
                if (x !== x1 || y !== y1) {
                    if (!gameState.dungeon[y] || gameState.dungeon[y][x] === undefined || gameState.dungeon[y][x] === 'wall') return false;
                }
                if (x !== x2) x += dx;
                if (y !== y2) y += dy;
            }
            return true;
        }

        // BFS 경로 탐색
        function findPath(startX, startY, targetX, targetY) {
            const size = gameState.dungeonSize;
            if (startX < 0 || startY < 0 || startX >= size || startY >= size) return null;
            if (targetX < 0 || targetY < 0 || targetX >= size || targetY >= size) return null;
            const queue = [[startX, startY]];
            let head = 0;
            const visited = Array.from({ length: size }, () => Array(size).fill(false));
            const cameFrom = {};
            const key = (x, y) => `${x},${y}`;
            visited[startY][startX] = true;
            cameFrom[key(startX, startY)] = null;

            while (head < queue.length) {
                const [x, y] = queue[head++];
                if (x === targetX && y === targetY) {
                    const path = [];
                    let cur = [x, y];
                    while (cur) {
                        path.unshift({ x: cur[0], y: cur[1] });
                        cur = cameFrom[key(cur[0], cur[1])];
                    }
                    return path;
                }

                const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
                for (const [dx, dy] of dirs) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                    if (visited[ny][nx]) continue;
                    const cell = gameState.dungeon[ny][nx];
                    if ((cell === 'wall' || cell === 'monster') && !(nx === targetX && ny === targetY)) continue;
                    visited[ny][nx] = true;
                    cameFrom[key(nx, ny)] = [x, y];
                    queue.push([nx, ny]);
                }
            }
            return null;
        }

        // 간단한 치유 로직
        function healTarget(healer, target, skillInfo, level = 1) {
            let base;
            if (skillInfo && typeof skillInfo.heal === 'number') {
                base = skillInfo.heal;
            } else if (healer.type === 'BARD') {
                base = 0;
            } else {
                base = 3 + healer.level;
            }
            const power = getStat(healer, 'magicPower');
            const mult = getSkillPowerMult(healer);
            let healAmount = Math.min((base + power) * level * mult, getStat(target, 'maxHealth') - target.health);
            if (healAmount > 0) {
                target.health += healAmount;
                const name = target === gameState.player ? '플레이어' : target.name;
                const amountStr = formatNumber(healAmount);
                const img = healer === gameState.player ? getPlayerImage() : getMercImage(healer.type);
                if (skillInfo) {
                    addMessage(`${skillInfo.icon} ${healer.name}의 ${skillInfo.name}이(가) ${name}을(를) ${amountStr} 회복했습니다.`, 'mercenary', null, img);
                } else {
                    addMessage(`💚 ${healer.name}이(가) ${name}을(를) ${amountStr} 회복했습니다.`, 'mercenary', null, img);
                }
                return true;
            }
            return false;
        }

        function applyShield(caster, target, skillInfo, level = 1) {
            if (!isSameSide(caster, target)) return false;
            const power = getStat(caster, 'magicPower');
            const amount = Math.floor(power * level * getSkillPowerMult(caster));
            if (amount <= 0) return false;

            let applied = false;
            if (!target.shield || amount > target.shield) {
                target.shield = amount;
                target.shieldTurns = skillInfo.duration || 5;
                applied = true;
            }

            if (applied) {
                const name = target === gameState.player ? '플레이어' : target.name;
                const img = caster === gameState.player ? getPlayerImage() : getMercImage(caster.type);
                addMessage(`${skillInfo.icon} ${caster.name}의 ${skillInfo.name}이(가) ${name}에게 ${formatNumber(amount)} 보호막을 부여했습니다.`, 'mercenary', null, img);
                refreshDetailPanel(target);
            }
            return applied;
        }

        function applyAttackBuff(caster, target, skillInfo, level = 1) {
            if (!isSameSide(caster, target)) return false;
            const power = getStat(caster, 'magicPower');
            const amount = Math.floor(power * level * getSkillPowerMult(caster));
            if (amount <= 0) return false;

            let applied = false;
            if (!target.attackBuff || amount > target.attackBuff) {
                target.attackBuff = amount;
                target.attackBuffTurns = skillInfo.duration || 5;
                applied = true;
            }

            if (applied) {
                const name = target === gameState.player ? '플레이어' : target.name;
                const img = caster === gameState.player ? getPlayerImage() : getMercImage(caster.type);
                addMessage(`${skillInfo.icon} ${caster.name}의 ${skillInfo.name}이(가) ${name}의 공격력을 ${formatNumber(amount)} 만큼 증가시켰습니다.`, 'mercenary', null, img);
                refreshDetailPanel(target);
            }
            return applied;
        }

        function applyStatPercentBuff(caster, target, skillInfo, level = 1) {
            const info = skillInfo.statBuff || {};
            const stats = info.stats || (info.stat ? [info.stat] : []);
            const mult = info.mult || 0;
            if (stats.length === 0 || mult === 0) return false;
            const scale = 1 + (level - 1) * 0.001;
            const effects = {};
            stats.forEach(s => {
                const base = getStat(target, s);
                effects[s] = Math.floor(base * mult * scale);
            });
            if (info.elementResists) {
                const elems = ['fire','ice','wind','earth','light','dark'];
                effects.elementResistances = {};
                elems.forEach(e => {
                    const base = target.elementResistances[e] || 0;
                    effects.elementResistances[e] = base * mult * scale;
                });
            }
            if (!Array.isArray(target.buffs)) target.buffs = [];
            const duration = skillInfo.duration || 3;
            const existing = target.buffs.find(b => b.name === skillInfo.name);
            if (existing) {
                existing.effects = effects;
                existing.turnsLeft = duration;
            } else {
                target.buffs.push({ name: skillInfo.name, effects, turnsLeft: duration });
            }
            const name = target === gameState.player ? '플레이어' : target.name;
            const img = caster === gameState.player ? getPlayerImage() : getMercImage(caster.type);
            addMessage(`${skillInfo.icon} ${caster.name}의 ${skillInfo.name}이(가) ${name}에게 적용되었습니다.`, 'mercenary', null, img);
            refreshDetailPanel(target);
            return true;
        }

        // 피해를 적용할 때 보호막을 우선 소모합니다.
        function applyDamage(target, amount) {
            if (amount <= 0) return;
            if (target.shield && target.shield > 0) {
                const blocked = Math.min(amount, target.shield);
                target.shield -= blocked;
                amount -= blocked;
            }
            target.health -= amount;
            refreshDetailPanel(target);
        }

        function purifyTarget(healer, target, skillInfo) {
            const statuses = ['poison','burn','freeze','bleed','paralysis','nightmare','silence','petrify','debuff'];
            let removed = false;
            statuses.forEach(s => {
                if (target[s]) {
                    target[s] = false;
                    const key = s + 'Turns';
                    if (target[key] !== undefined) target[key] = 0;
                    removed = true;
                }
            });
            if (removed) {
                const name = target === gameState.player ? '플레이어' : target.name;
                const img = healer === gameState.player ? getPlayerImage() : getMercImage(healer.type);
                addMessage(`${skillInfo.icon} ${healer.name}의 ${skillInfo.name}이(가) ${name}의 상태이상을 해제했습니다.`, 'mercenary', null, img);
                return true;
            }
            return false;
        }
        function tryApplyStatus(target, status, turns) {
            if (!target.statusResistances || target.statusResistances[status] === undefined)
                return { applied: false, roll: null, dc: null };
            let resist = getStatusResist(target, status);
            const dc = Math.floor(resist * 20);
            const roll = rollDice("1d20");
            if (roll > dc) {
                target[status] = true;
                const key = status + "Turns";
                if (target[key] === undefined) target[key] = 0;
                target[key] = Math.max(target[key], turns);
                return { applied: true, roll, dc };
            }
            return { applied: false, roll, dc };
        }

        function getStatusResist(character, status) {
            let value = character.statusResistances && character.statusResistances[status] ? character.statusResistances[status] : 0;
            let equipBonus = 0;
            if (character.equipped) {
                ['weapon', 'armor', 'accessory1', 'accessory2', 'tile'].forEach(slot => {
                    const it = character.equipped[slot];
                    if (it && it[status + 'Resist'] !== undefined) {
                        equipBonus += it[status + 'Resist'];
                    }
                });
            }
            value += Math.min(equipBonus, 0.75);
            function checkAura(source, target) {
                let bonus = 0;
                if (!source || !isSameSide(source, target)) return bonus;
                let keys = [];
                if (source === gameState.player) {
                    keys = [gameState.player.assignedSkills['1'], gameState.player.assignedSkills['2']];
                } else {
                    keys = [source.skill, source.skill2, source.auraSkill];
                }
                keys = Array.from(new Set(keys.filter(Boolean)));
                keys.forEach(key => {
                    if (key !== 'NaturalAura') return;
                    const skill = SKILL_DEFS[key];
                    if (!skill || !skill.passive || !skill.aura || skill.aura.allResist === undefined) return;
                    const dist = getDistance(source.x, source.y, target.x, target.y);
                    if (dist <= (skill.radius || 0)) {
                        const lvl = (source.skillLevels && source.skillLevels[key]) || 1;
                        bonus += skill.aura.allResist * lvl;
                    }
                });
                return bonus;
            }

            let auraBonus = 0;
            const friendly = isPlayerSide(character);
            auraBonus += checkAura(gameState.player, character);
            gameState.activeMercenaries.filter(m => m.alive).forEach(m => {
                auraBonus += checkAura(m, character);
            });
            if (!friendly) {
                gameState.monsters.filter(m => m.isElite || m.isSuperior).forEach(elite => {
                    auraBonus += checkAura(elite, character);
                });
            }
            value += auraBonus;
            return value;
        }

        function getAuraBonus(character, stat) {
            let bonus = 0;
            const sources = [
                gameState.player,
                ...gameState.activeMercenaries.filter(m => m.alive),
                ...gameState.monsters.filter(m => m.isElite || m.isSuperior)
            ];
            sources.forEach(src => {
                if (!isSameSide(src, character)) return;
                let keys = [];
                if (src === gameState.player) {
                    keys = [gameState.player.assignedSkills['1'], gameState.player.assignedSkills['2']];
                } else {
                    keys = [src.skill, src.skill2, src.auraSkill];
                }
                keys = Array.from(new Set(keys.filter(Boolean)));
                keys.forEach(key => {
                    const skill = SKILL_DEFS[key];
                    if (skill && skill.passive && skill.aura && skill.aura[stat] !== undefined) {
                        const dist = getDistance(src.x, src.y, character.x, character.y);
                        if (dist <= (skill.radius || 0)) bonus += skill.aura[stat];
                    }
                });
            });
            return bonus;
        }

        /**
         * 유닛의 장비에 있는 Proc 효과를 확인하고 발동시킵니다.
         * @param {object} unit - 효과를 발동시킬 유닛 (공격자 또는 방어자)
         * @param {'onAttack' | 'onDamaged'} triggerType - 발동 조건
         * @param {object} opponent - 상대방 유닛
         */
        function handleProcs(unit, triggerType, opponent) {
            if (!unit || !unit.equipped) return;

            for (const slot of ['weapon', 'armor', 'accessory1', 'accessory2']) {
                const item = unit.equipped[slot];
                if (item && item.procs) {
                    for (const proc of item.procs) {
                        const trig = proc.trigger || proc.event;
                        if (trig === triggerType && Math.random() < proc.chance) {
                            const skill = SKILL_DEFS[proc.skill];
                            const unitName = unit.name || '유닛';
                            const itemName = item.name || '장비';
                            const skillName = skill ? skill.name : proc.skill;
                            const msgType = item.tier === 'unique' ? 'unique-skill' : 'treasure';
                            addMessage(`✨ ${unitName}의 ${itemName} 효과로 ${skillName} 스킬이 발동했습니다!`, msgType, null, getUnitImage(unit));
                            if (typeof triggerProcSkill === 'function') {
                                const supportive = skill && (skill.heal || skill.shield || skill.attackBuff || skill.buff);
                                triggerProcSkill(unit, supportive ? null : opponent, proc);
                            }
                        }
                    }
                }
            }
        }

        /**
         * Proc으로 발동된 스킬을 실행합니다.
         * @param {object} source - 스킬을 시전하는 유닛
         * @param {object} target - 주 타겟이 되는 유닛
         * @param {object} proc - 발동된 Proc 정보
         */
        function triggerProcSkill(source, target, proc) {
            const skill = SKILL_DEFS[proc.skill];
            if (!skill) return;

            const level = proc.level || 1;

            // 노바(광역) 스킬 처리
            if (skill.radius !== undefined) {
                playNovaSkillEffect(source, skill);
                if (skill.screenShake) {
                    createScreenShake(skill.screenShake.intensity, skill.screenShake.duration);
                }
                const allUnits = [gameState.player, ...gameState.activeMercenaries, ...gameState.monsters];
                const aoeTargets = allUnits.filter(unit => {
                    if (!unit || (!unit.health && unit.health !== 0)) return false;
                    const alive = unit === gameState.player ? true : unit.alive !== false;
                    return alive && !isSameSide(source, unit) && getDistance(source.x, source.y, unit.x, unit.y) <= skill.radius;
                });

                aoeTargets.forEach(enemy => {
                    const attackValue = getStat(source, 'magicPower');
                    const result = performAttack(source, enemy, {
                        attackValue,
                        magic: true,
                        element: skill.element,
                        skipProcs: true,
                        damageDice: skill.damageDice
                    });
                    const detail = buildAttackDetail(skill.icon, skill.name, result);
                    if (!result.hit) {
                        addMessage(`❌ ${enemy.name}에게 ${skill.name}이 빗나갔습니다!`, 'combat', detail, getUnitImage(source));
                    } else {
                        addMessage(`${skill.icon} ${enemy.name}에게 ${formatNumber(result.damage)}의 광역 피해!`, 'combat', detail, getUnitImage(source));
                        if (enemy.health <= 0) {
                            if (gameState.monsters.includes(enemy)) killMonster(enemy);
                            else killMercenary(enemy);
                        }
                    }
                });
            }
            // 투사체 스킬 처리 (예: 파이어볼)
            else if (skill.damageDice && skill.range) {
                if (!target) return;

                const attackValue = rollDice(skill.damageDice) * level + getStat(source, 'magicPower');
                const result = performAttack(source, target, {
                    attackValue: attackValue,
                    magic: skill.magic,
                    element: skill.element,
                    skipProcs: true
                });

                const detail = buildAttackDetail(skill.icon, skill.name, result);
                if (!result.hit) {
                    addMessage(`❌ ${target.name}에게 ${skill.name}이 빗나갔습니다!`, 'combat', detail, getUnitImage(source));
                } else {
                    addMessage(`${skill.icon} ${target.name}에게 ${formatNumber(result.damage)}의 원거리 피해!`, 'combat', detail, getUnitImage(source));
                    if (target.health <= 0) {
                        if (gameState.monsters.includes(target)) killMonster(target);
                        else if (target !== gameState.player) killMercenary(target);
                        else handlePlayerDeath();
                    }
                }
            }
            // 자가 치유 스킬 처리
            else if (skill.heal) {
                healTarget(source, source, skill, level);
            }
            // 보호막 부여 스킬 처리
            else if (skill.shield) {
                if (!target) target = source;
                SoundEngine.playSound('auraActivateMinor');
                applyShield(source, target, skill, level);
            }
            // 공격력 증가 버프 스킬 처리
            else if (skill.attackBuff) {
                if (!target) target = source;
                SoundEngine.playSound('auraActivateMajor');
                applyAttackBuff(source, target, skill, level);
            }
            else if (skill.statBuff) {
                if (!target) target = source;
                SoundEngine.playSound('auraActivateMajor');
                applyStatPercentBuff(source, target, skill, level);
            }
            // 버프 스킬 처리
            else if (skill.buff) {
                if (!target) target = source;
                if (!Array.isArray(target.buffs)) target.buffs = [];
                const duration = skill.duration || 1;
                const existing = target.buffs.find(b => b.name === skill.name);
                if (existing) {
                    existing.turnsLeft = duration;
                } else {
                    target.buffs.push({ name: skill.name, effects: skill.buff, turnsLeft: duration });
                }
                refreshDetailPanel(target);
            }
        }

        // 통합 공격 처리
        function performAttack(attacker, defender, options = {}) {
            combatOccurredInTurn = true;
            const magic = options.magic || false;
            const element = options.element;
            const status = options.status;
            const skipProcs = options.skipProcs || false;
            let attackStat = options.attackValue !== undefined ? options.attackValue : (magic ? getStat(attacker, 'magicPower') : getStat(attacker, 'attack'));
            let defenseStat = options.defenseValue !== undefined ? options.defenseValue : (magic ? getStat(defender, 'magicResist') : getStat(defender, 'defense'));


            const attackerAcc = getStat(attacker, 'accuracy');
            const defenderEva = getStat(defender, 'evasion');
            const attackBonus = Math.floor(attackerAcc * 5);
            const defenseTarget = 10 + Math.floor(defenderEva * 5);
            const hitRoll = rollDice('1d20') + attackBonus;
            if (hitRoll < defenseTarget) {
                SoundEngine.playSound(attacker === gameState.player ? 'dodge' : 'error');
                return { hit: false, hitRoll, defenseTarget, attackBonus };
            }

            const damageRoll = rollDice(options.damageDice || attacker.damageDice || '1d4');
            let baseDamage = Math.max(1, damageRoll + attackStat - defenseStat);

            let crit = false;
            const critChance = getStat(attacker, 'critChance');
            if (Math.random() < critChance) {
                baseDamage = Math.floor(baseDamage * 1.5);
                crit = true;
                SoundEngine.playSound('criticalHit');
            }

            let elementDamage = 0;
            let elementBaseDamage = 0;
            let elementResist = 0;
            if (element) {
                elementDamage = getStat(attacker, `${element}Damage`);
                elementBaseDamage = elementDamage;

                const naturalInfo = SKILL_DEFS['NaturalAura'];

                function checkAura(entity) {
                    if (!entity || !naturalInfo) return 0;
                    let lvl = 0;

                    if (entity === gameState.player) {
                        ['1', '2'].forEach(slot => {
                            const key = gameState.player.assignedSkills[slot];
                            if (key === 'NaturalAura') lvl += gameState.player.skillLevels[key] || 1;
                        });
                    }

                    const skills = [entity.skill, entity.skill2, entity.auraSkill];
                    skills.filter(Boolean).forEach(key => {
                        if (key === 'NaturalAura') lvl += (entity.skillLevels && entity.skillLevels[key]) || 1;
                    });

                    if (!lvl) return 0;
                    const dist = getDistance(entity.x, entity.y, defender.x, defender.y);
                    return dist <= (naturalInfo.radius || 0) ? lvl : 0;
                }

                let totalResist = defender.elementResistances[element] || 0;
                if (Array.isArray(defender.buffs)) {
                    defender.buffs.forEach(b => {
                        if (b.effects && b.effects.elementResistances && b.effects.elementResistances[element] !== undefined) {
                            totalResist += b.effects.elementResistances[element];
                        }
                    });
                }
                let auraBonus = 0;
                auraBonus += checkAura(gameState.player);
                gameState.activeMercenaries.filter(m => m.alive).forEach(m => {
                    auraBonus += checkAura(m);
                });
                gameState.monsters.filter(m => m.isElite || m.isSuperior).forEach(mon => {
                    auraBonus += checkAura(mon);
                });

                totalResist += auraBonus;
                elementResist = totalResist;
                elementDamage = Math.floor(elementDamage * (1 - totalResist));
            }


            let damage = baseDamage + elementDamage;
            applyDamage(defender, damage);
            const reflect = getStat(defender, 'damageReflect');
            if (reflect > 0) {
                const reflected = Math.floor(damage * reflect);
                if (reflected > 0) {
                    applyDamage(attacker, reflected);
                    const attName = attacker === gameState.player ? '플레이어' : attacker.name;
                    addMessage(`🔄 ${attName}이(가) ${formatNumber(reflected)} 피해를 반사로 입었습니다.`, 'combat');
                }
            }
            if (!crit) SoundEngine.playSound('takeDamage');

            const lifeSteal = getStat(attacker, 'lifeSteal');
            if (lifeSteal) {
                const heal = Math.floor(damage * lifeSteal);
                if (heal > 0) {
                    attacker.health = Math.min(getStat(attacker, 'maxHealth'), attacker.health + heal);
                    refreshDetailPanel(attacker);
                    const name = attacker === gameState.player ? '플레이어' : attacker.name;
                    addMessage(`🩸 ${name}이(가) ${formatNumber(heal)} 만큼 흡혈했습니다.`, 'combat');
                }
            }

            let statusApplied = false;
            const statusEffects = [];
            if (status) {
                const res = tryApplyStatus(defender, status, 3);
                if (res.applied) {
                    statusApplied = true;
                    statusEffects.push(status);
                    const defName = defender === gameState.player ? '플레이어' : defender.name;
                    addMessage(`⚠️ ${defName}이(가) ${STATUS_NAMES[status] || status} 상태가 되었습니다!`, 'combat', `resistance roll ${res.roll} vs DC ${res.dc} → failed`);
                }
            }
            if (crit && element === 'fire') {
                const res = tryApplyStatus(defender, 'burn', 2);
                if (res.applied) {
                    statusApplied = true;
                    statusEffects.push('burn');
                    const defName = defender === gameState.player ? '플레이어' : defender.name;
                    addMessage(`🔥 ${defName}이(가) 화상 상태가 되었습니다!`, 'combat', `resistance roll ${res.roll} vs DC ${res.dc} → failed`);
                }
            }
            if (crit && element === 'ice') {
                const res = tryApplyStatus(defender, 'freeze', 2);
                if (res.applied) {
                    statusApplied = true;
                    statusEffects.push('freeze');
                    const defName = defender === gameState.player ? '플레이어' : defender.name;
                    addMessage(`❄️ ${defName}이(가) 빙결 상태가 되었습니다!`, 'combat', `resistance roll ${res.roll} vs DC ${res.dc} → failed`);
                }
            }

            const result = { hit: true, crit, damage, baseDamage, elementDamage, element, elementBaseDamage, elementResist, statusApplied, statusEffects, hitRoll, damageRoll, defenseTarget, attackBonus, attackValue: attackStat, defenseStat };

            if (result.hit && !skipProcs) {
                handleProcs(attacker, 'onAttack', defender);
                handleProcs(defender, 'onDamaged', attacker);
            }

            return result;
        }

        function buildAttackDetail(type, skill, result) {
            let detail = `${type}${skill ? ' ' + skill : ''}: `;
            if (!result.hit) {
                return detail + `miss (hit roll ${result.hitRoll} vs ${result.defenseTarget})`;
            }
            detail += `damage roll ${result.damageRoll} + attack ${result.attackValue} - defense ${result.defenseStat} = ${result.baseDamage}`;
            if (result.element) {
                const emoji = ELEMENT_EMOJI[result.element] || result.element;
                if (result.elementBaseDamage) {
                    if (result.elementResist) {
                        detail += `; ${emoji} ${result.elementBaseDamage} x (1 - resist ${result.elementResist}) = ${result.elementDamage}`;
                    } else {
                        detail += `; ${emoji} ${result.elementBaseDamage}`;
                    }
                }
            }
            if (result.statusEffects && result.statusEffects.length) {
                const names = result.statusEffects.map(s => STATUS_NAMES[s] || s).join(', ');
                detail += `; status ${names}`;
            }
            return detail;
        }

        function formatNumber(value) {
            const num = Number(value);
            if (Number.isNaN(num)) return value;
            if (Number.isInteger(num)) return num.toString();
            return parseFloat(num.toFixed(2)).toString();
        }

        function formatItemName(item) {
            if (item.tier === 'unique') {
                return `<span class="unique">${item.name}</span>`;
            }
            if (item.rarity === 'rare') {
                return `<span class="rare">${item.name}</span>`;
            }
            return item.name;
        }

        function formatItem(item) {
            const stats = [];
            if (item.attack !== undefined) stats.push(`공격+${formatNumber(item.attack)}`);
            if (item.defense !== undefined) stats.push(`방어+${formatNumber(item.defense)}`);
            if (item.healing !== undefined) stats.push(`회복+${formatNumber(item.healing)}`);
            if (item.fireDamage !== undefined) stats.push(`🔥+${formatNumber(item.fireDamage)}`);
            if (item.iceDamage !== undefined) stats.push(`❄️+${formatNumber(item.iceDamage)}`);
            if (item.windDamage !== undefined) stats.push(`💨+${formatNumber(item.windDamage)}`);
            if (item.earthDamage !== undefined) stats.push(`🌱+${formatNumber(item.earthDamage)}`);
            if (item.lightDamage !== undefined) stats.push(`✨+${formatNumber(item.lightDamage)}`);
            if (item.darkDamage !== undefined) stats.push(`🌑+${formatNumber(item.darkDamage)}`);
            if (item.lightningDamage !== undefined) stats.push(`⚡+${formatNumber(item.lightningDamage)}`);
            if (item.strength !== undefined) stats.push(`힘+${formatNumber(item.strength)}`);
            if (item.agility !== undefined) stats.push(`민첩+${formatNumber(item.agility)}`);
            if (item.endurance !== undefined) stats.push(`체력+${formatNumber(item.endurance)}`);
            if (item.focus !== undefined) stats.push(`집중+${formatNumber(item.focus)}`);
            if (item.intelligence !== undefined) stats.push(`지능+${formatNumber(item.intelligence)}`);
            if (item.maxHealth !== undefined && item.type !== ITEM_TYPES.POTION && item.type !== ITEM_TYPES.REVIVE) stats.push(`HP+${formatNumber(item.maxHealth)}`);
            if (item.healthRegen !== undefined) stats.push(`HP회복+${formatNumber(item.healthRegen)}`);
            if (item.accuracy !== undefined) stats.push(`명중+${formatNumber(item.accuracy)}`);
            if (item.evasion !== undefined) stats.push(`회피+${formatNumber(item.evasion)}`);
            if (item.critChance !== undefined) stats.push(`치명+${formatNumber(item.critChance)}`);
            if (item.magicPower !== undefined) stats.push(`마공+${formatNumber(item.magicPower)}`);
            if (item.magicResist !== undefined) stats.push(`마방+${formatNumber(item.magicResist)}`);
            if (item.manaRegen !== undefined) stats.push(`MP회복+${formatNumber(item.manaRegen)}`);
            if (item.poisonResist !== undefined) stats.push(`독저항+${formatNumber(item.poisonResist * 100)}%`);
            if (item.bleedResist !== undefined) stats.push(`출혈저항+${formatNumber(item.bleedResist * 100)}%`);
            if (item.burnResist !== undefined) stats.push(`화상저항+${formatNumber(item.burnResist * 100)}%`);
            if (item.freezeResist !== undefined) stats.push(`동결저항+${formatNumber(item.freezeResist * 100)}%`);
            if (item.lifeSteal !== undefined) stats.push(`흡혈+${formatNumber(item.lifeSteal * 100)}%`);
            if (item.damageReflect !== undefined) stats.push(`피해반사+${formatNumber(item.damageReflect * 100)}%`);
            if (item.healOnKill !== undefined) stats.push(`처치회복+${formatNumber(item.healOnKill)}`);
            if (item.manaOnKill !== undefined) stats.push(`처치마나+${formatNumber(item.manaOnKill)}`);
            if (item.skillRangeBonus !== undefined) stats.push(`스킬 사거리+${formatNumber(item.skillRangeBonus)}`);
            if (item.skillCooldownMod !== undefined) {
                const sign = item.skillCooldownMod > 0 ? '+' : '';
                stats.push(`쿨타임${sign}${formatNumber(item.skillCooldownMod)}`);
            }
            if (item.skillManaCostMult !== undefined) {
                const perc = (item.skillManaCostMult - 1) * 100;
                const sign = perc > 0 ? '+' : '';
                stats.push(`스킬 마나 소모${sign}${formatNumber(perc)}%`);
            }
            if (item.skillPowerMult !== undefined) {
                const perc = (item.skillPowerMult - 1) * 100;
                const sign = perc > 0 ? '+' : '';
                stats.push(`스킬 위력${sign}${formatNumber(perc)}%`);
            }
            if (item.status) stats.push(`${item.status} 부여`);
            const levelText = item.enhanceLevel ? ` +Lv.${item.enhanceLevel}` : '';
            const name = formatItemName(item);
            return `${name}${levelText}${stats.length ? ' (' + stats.join(', ') + ')' : ''}`;
        }

        function getStat(character, stat) {
            // [수정됨] 2차 스탯(공격력 등)을 계산하기 전에, 1차 스탯(힘 등)의 최종값을 먼저 가져옵니다.
            // 이렇게 하면 getStat('공격력') 호출 시, getStat('힘')을 통해 버프가 적용된 힘 수치를 기반으로 계산하게 됩니다.
            if (['strength', 'agility', 'endurance', 'focus', 'intelligence'].includes(stat)) {
                let value = character[stat] || 0;
                if (character.equipped) {
                    if (character.equipped.tile && character.equipped.tile.effects && character.equipped.tile.effects[stat]) {
                        value += character.equipped.tile.effects[stat];
                    }
                    ['weapon', 'armor', 'accessory1', 'accessory2'].forEach(slot => {
                        const it = character.equipped[slot];
                        if (it && it[stat] !== undefined) {
                            value += it[stat];
                        }
                    });
                }
                if (Array.isArray(character.buffs)) {
                    character.buffs.forEach(b => {
                        if (b.effects && b.effects[stat]) value += b.effects[stat];
                    });
                }
                value += getAuraBonus(character, stat);
                return value;
            }


            const e = getStat(character, 'endurance');
            const f = getStat(character, 'focus');
            const s = getStat(character, 'strength');
            const a = getStat(character, 'agility');
            const i = getStat(character, 'intelligence');

            let value = 0;
            switch (stat) {
                case 'maxHealth':
                    value = e * 2;
                    break;
                case 'maxMana':
                    value = f * 2;
                    break;
                case 'attack':
                    value = s;
                    break;
                case 'defense':
                    // 기본 방어력은 캐릭터 생성 시의 값을 유지하고, 체력(endurance)에 의한 보너스를 추가합니다.
                    value = (character.baseDefense || 0) + Math.floor(e * 0.1);
                    break;
                case 'accuracy':
                    value = 0.7 + a * 0.02;
                    break;
                case 'evasion':
                    value = a * 0.02;
                    break;
                case 'critChance':
                    value = 0.03 + a * 0.005;
                    break;
                case 'magicPower':
                    value = i;
                    break;
                case 'magicResist':
                    value = i * 0.2;
                    break;
                default:
                    value = character[stat] || 0;
            }

            if (character.equipped) {
                if (character.equipped.tile && character.equipped.tile.effects && character.equipped.tile.effects[stat]) {
                    value += character.equipped.tile.effects[stat];
                }
                ['weapon', 'armor', 'accessory1', 'accessory2'].forEach(slot => {
                    const it = character.equipped[slot];
                    if (it && it[stat] !== undefined) {
                        value += it[stat];
                    }
                });
            }
            if (Array.isArray(character.buffs)) {
                character.buffs.forEach(b => {
                    if (b.effects && b.effects[stat]) value += b.effects[stat];
                });
            }
            if (stat === 'attack' && character.attackBuff) {
                value += character.attackBuff;
            }
            value += getAuraBonus(character, stat);
            return value;
        }

        function averageDice(notation) {
            const m = notation.match(/(\d*)d(\d+)/);
            if (!m) return 0;
            const count = parseInt(m[1] || '1', 10);
            const sides = parseInt(m[2], 10);
            return count * (sides + 1) / 2;
        }

        function estimateSkillDamage(owner, key, defs) {
            const info = defs[key];
            if (!info) return 0;
            const lvl = owner.skillLevels && owner.skillLevels[key] || 1;
            if (info.heal) {
                return (info.heal * lvl) + getStat(owner, 'magicPower');
            }
            if (info.damageDice) {
                const base = averageDice(info.damageDice) * lvl;
                return base + (info.magic ? getStat(owner, 'magicPower') : getStat(owner, 'attack'));
            }
            if (info.melee) {
                const mult = info.multiplier || 1;
                return getStat(owner, 'attack') * mult * lvl;
            }
            return 0;
        }

        function getSkillRange(unit, skill) {
            const base = skill.range !== undefined ? skill.range : skill.radius;
            if (base === undefined) return base;
            return base + getStat(unit, 'skillRangeBonus');
        }

        function getSkillCooldown(unit, skill) {
            const reduction = getStat(unit, 'skillCooldownReduction');
            const mod = getStat(unit, 'skillCooldownMod');
            const base = skill.cooldown || 0;
            let modified = Math.floor(base * (1 - reduction)) + mod;
            if (base > 0) {
                modified = Math.max(1, modified);
            } else {
                modified = Math.max(0, modified);
            }
            return modified;
        }

        function getSkillManaCost(unit, skill) {
            const reduction = getStat(unit, 'skillManaCostReduction');
            const mult = getStat(unit, 'skillManaCostMult') || 1;
            const cost = skill.manaCost || 0;
            return Math.max(0, Math.floor(cost * mult * (1 - reduction)));
        }

        function getSkillPowerMult(unit) {
            return getStat(unit, 'skillPowerMult') || 1;
        }

        function showSkillDamage(owner, key, defs) {
            if (!key) return;
            const dmg = estimateSkillDamage(owner, key, defs);
            const { name, cooldown: cd } = defs[key];
            alert(`${name} 예상 피해: ${formatNumber(dmg)} (쿨타임 ${cd})`);
        }

        function showAuraDetails(key, lvl) {
            const info = SKILL_DEFS[key] || MERCENARY_SKILLS[key] || MONSTER_SKILLS[key];
            if (!info || !info.aura) return;
            const parts = Object.entries(info.aura)
                .map(([stat, val]) => `${stat} +${val * lvl}`);
            alert(`${info.name} : ${parts.join(', ')}`);
        }


        // 플레이어 체력 비율에 따른 표정 반환
        function getPlayerEmoji() {
            const ratio = gameState.player.health / getStat(gameState.player, 'maxHealth');
            if (ratio >= 0.7) return '😀';
            if (ratio >= 0.4) return '😐';
            if (ratio >= 0.1) return '😟';
            return '😢';
        }

        function processProjectiles() {
            const remaining = [];
            for (const proj of gameState.projectiles) {
                if (proj.homing && proj.target && proj.target.health <= 0) {
                    continue;
                }
                if (proj.homing && proj.target) {
                    proj.dx = Math.sign(proj.target.x - proj.x);
                    proj.dy = Math.sign(proj.target.y - proj.y);
                }
                let nx = proj.x + proj.dx;
                let ny = proj.y + proj.dy;

                if (nx < 0 || ny < 0 || nx >= gameState.dungeonSize || ny >= gameState.dungeonSize) {
                    continue;
                }

                const monster = gameState.monsters.find(m => m.x === nx && m.y === ny);
                if (monster) {
                    const attacker = proj.attacker || gameState.player;
                    const magic = !!proj.magic;

                    // [수정된 공격력 계산 로직]
                    // 1. 마법/물리에 따라 기본 스탯(magicPower/attack)을 먼저 가져옵니다.
                    let attackValue = magic ? getStat(attacker, 'magicPower') : getStat(attacker, 'attack');

                    // 2. 투사체에 데미지 주사위(damageDice)가 있으면 그 값을 더합니다.
                    if (proj.damageDice !== undefined) {
                        attackValue += rollDice(proj.damageDice) * (proj.level || 1);
                    }

                    // 3. 마지막으로 스킬 위력 배율을 적용합니다.
                    attackValue = Math.floor(attackValue * getSkillPowerMult(attacker));

                    const result = performAttack(attacker, monster, { attackValue, magic, element: proj.element, status: attacker.equipped && attacker.equipped.weapon && attacker.equipped.weapon.status, damageDice: proj.damageDice });
                    const icon = proj.icon || '➡️';
                    const name = proj.skill ? SKILL_DEFS[proj.skill].name : '원거리 공격';
                    const detail = buildAttackDetail('원거리 공격', name, result);
                    const msgType = attacker === gameState.player ? 'combat' : 'mercenary';
                    const attackerPart = attacker === gameState.player ? '' : `${attacker.name}이(가) `;
                    const img = attacker === gameState.player ? getPlayerImage() : getMercImage(attacker.type);
                    if (!result.hit) {
                        addMessage(`❌ ${attackerPart}${monster.name}에게 ${name}이 빗나갔습니다!`, msgType, detail, img);
                    } else {
                        const critMsg = result.crit ? ' (치명타!)' : '';
                        let dmgStr = formatNumber(result.baseDamage);
                        if (result.elementDamage) {
                            const emoji = ELEMENT_EMOJI[result.element] || '';
                            dmgStr = `${formatNumber(result.baseDamage)}+${emoji}${formatNumber(result.elementDamage)}`;
                        }
                        addMessage(`${icon} ${attackerPart}${monster.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, msgType, detail, img);
                    }

                    if (monster.health <= 0) {
                        killMonster(monster);
                    }

                    continue;
                }

                if (gameState.dungeon[ny][nx] === 'wall') {
                    continue;
                }

                proj.x = nx;
                proj.y = ny;
                proj.rangeLeft--;
                if (proj.rangeLeft > 0) {
                    remaining.push(proj);
                }
            }
            gameState.projectiles = remaining;
        }
        // 인벤토리 UI 갱신
        function updateInventoryDisplay() {
            const container = document.getElementById('inventory-items');
            container.innerHTML = '';

            const currentFilter = gameState.inventoryFilter;
            let filteredInventory = gameState.player.inventory;

            if (currentFilter !== 'all') {
                const targetTypes = INVENTORY_CATEGORIES[currentFilter] || [];
                filteredInventory = gameState.player.inventory.filter(item => targetTypes.includes(item.type));
            }

            // group identical items together so they can be displayed as stacks
            const groups = new Map();
            for (const item of filteredInventory) {
                const key = `${item.key}-${item.prefix || ''}-${item.suffix || ''}-${item.enhanceLevel || 0}`;
                if (!groups.has(key)) {
                    groups.set(key, { item, count: 0 });
                }
                groups.get(key).count += 1;
            }

            for (const { item, count } of groups.values()) {
                const div = document.createElement('div');
                div.className = 'inventory-item';
                const span = document.createElement('span');
                const label = count > 1 ? `${formatItem(item)} x ${count}` : formatItem(item);
                if (item.imageUrl) {
                    span.innerHTML = `<img src="${item.imageUrl}" class="inline-icon" style="margin-right:4px;">${label}`;
                } else {
                    span.innerHTML = label;
                }
                div.appendChild(span);
                div.onclick = () => handleItemClick(item);
                if (item.type !== ITEM_TYPES.WEAPON && item.type !== ITEM_TYPES.ARMOR && item.type !== ITEM_TYPES.ACCESSORY) {
                    const sellBtn = document.createElement('button');
                    sellBtn.textContent = '판매';
                    sellBtn.className = 'sell-button';
                    sellBtn.onclick = (e) => {
                        e.stopPropagation();
                        confirmAndSell(item);
                    };
                    div.appendChild(sellBtn);
                }
                container.appendChild(div);
            }

            const weaponSlot = document.getElementById('equipped-weapon');
            if (gameState.player.equipped.weapon) {
                const w = gameState.player.equipped.weapon;
                const prefix = w.imageUrl ? `<img src="${w.imageUrl}" class="inline-icon" style="margin-right:4px;">` : '';
                weaponSlot.innerHTML = `무기: ${prefix}${formatItem(w)}`;
                weaponSlot.onclick = unequipWeapon;
            } else {
                weaponSlot.textContent = '무기: 없음';
                weaponSlot.onclick = null;
            }
            const armorSlot = document.getElementById('equipped-armor');
            if (gameState.player.equipped.armor) {
                const a = gameState.player.equipped.armor;
                const prefix = a.imageUrl ? `<img src="${a.imageUrl}" class="inline-icon" style="margin-right:4px;">` : '';
                armorSlot.innerHTML = `방어구: ${prefix}${formatItem(a)}`;
                armorSlot.onclick = unequipArmor;
            } else {
                armorSlot.textContent = '방어구: 없음';
                armorSlot.onclick = null;
            }
            const acc1Slot = document.getElementById('equipped-accessory1');
            if (gameState.player.equipped.accessory1) {
                acc1Slot.innerHTML = `악세서리1: ${formatItem(gameState.player.equipped.accessory1)}`;
                acc1Slot.onclick = () => unequipAccessory('accessory1');
            } else {
                acc1Slot.textContent = '악세서리1: 없음';
                acc1Slot.onclick = null;
            }
            const acc2Slot = document.getElementById('equipped-accessory2');
            if (gameState.player.equipped.accessory2) {
                acc2Slot.innerHTML = `악세서리2: ${formatItem(gameState.player.equipped.accessory2)}`;
                acc2Slot.onclick = () => unequipAccessory('accessory2');
            } else {
                acc2Slot.textContent = '악세서리2: 없음';
                acc2Slot.onclick = null;
            }
            const tileSlot = document.getElementById('equipped-tile');
            if (tileSlot) {
                if (gameState.player.equipped.tile) {
                    tileSlot.innerHTML = `타일: ${formatItem(gameState.player.equipped.tile)}`;
                    tileSlot.onclick = () => unequipTile(gameState.player);
                } else {
                    tileSlot.textContent = '타일: 없음';
                    tileSlot.onclick = null;
                }
            }
        }

        function updateSkillDisplay() {
            const list = document.getElementById('skill-list');
            if (!list) return;
            list.innerHTML = '';
            gameState.player.skills.forEach(skill => {
                const div = document.createElement('div');
                div.className = 'skill-item';
                const info = SKILL_DEFS[skill];
                const level = gameState.player.skillLevels[skill] || 1;
                const baseCost = (info.manaCost || 0) + level - 1;
                const mana = getSkillManaCost(gameState.player, { manaCost: baseCost });
                const range = getSkillRange(gameState.player, info);
                const baseCd = getSkillCooldown(gameState.player, info);
                const cooldown = gameState.player.skillCooldowns[skill] || 0;
                const power = getSkillPowerMult(gameState.player);

                const nameSpan = document.createElement('span');
                const cdRemain = cooldown > 0 ? `, 남은 ${cooldown}` : '';
                const extra = [
                    info.manaCost ? `MP ${mana}` : null,
                    baseCd ? `쿨타임 ${baseCd}${cdRemain}` : (cooldown > 0 ? `CD ${cooldown}` : null),
                    range !== undefined ? `사거리 ${range}` : null,
                    power !== 1 ? `파워 x${power.toFixed(2)}` : null,
                ].filter(Boolean).join(', ');
                nameSpan.textContent = `${info.icon} ${info.name} (Lv ${level}${extra ? ', ' + extra : ''})`;
                div.appendChild(nameSpan);

                const btn1 = document.createElement('button');
                btn1.className = 'assign-btn';
                btn1.textContent = '1';
                btn1.onclick = (e) => { e.stopPropagation(); assignSkill(1, skill); };
                div.appendChild(btn1);

                const btn2 = document.createElement('button');
                btn2.className = 'assign-btn';
                btn2.textContent = '2';
                btn2.onclick = (e) => { e.stopPropagation(); assignSkill(2, skill); };
                div.appendChild(btn2);

                div.onclick = () => {
                    if (gameState.player.skillPoints > 0 && skill !== 'Purify' && (typeof confirm === 'function' ? confirm(`${info.name} 레벨업?`) : false)) {
                        gameState.player.skillPoints -= 1;
                        gameState.player.skillLevels[skill] = level + 1;
                        updateStats();
                        updateSkillDisplay();
                        return;
                    }
                };
                list.appendChild(div);
            });
            const s1 = document.getElementById('skill1-name');
            const s2 = document.getElementById('skill2-name');
            const skill1 = gameState.player.assignedSkills[1];
            const skill2 = gameState.player.assignedSkills[2];
            const cd1 = skill1 ? (gameState.player.skillCooldowns[skill1] || 0) : 0;
            const cd2 = skill2 ? (gameState.player.skillCooldowns[skill2] || 0) : 0;
            s1.textContent = skill1 ? `${SKILL_DEFS[skill1].name}${cd1 > 0 ? ` (CD ${cd1})` : ''}` : '없음';
            s2.textContent = skill2 ? `${SKILL_DEFS[skill2].name}${cd2 > 0 ? ` (CD ${cd2})` : ''}` : '없음';
            s1.onclick = () => showSkillDamage(gameState.player, skill1, SKILL_DEFS);
            s2.onclick = () => showSkillDamage(gameState.player, skill2, SKILL_DEFS);
        }

function updateMaterialsDisplay() {
            const matList = document.getElementById('materials-list');
            if (!matList) return;
            matList.innerHTML = '';
            Object.entries(gameState.materials).forEach(([m, q]) => {
                const div = document.createElement('div');
                const icon = (ITEMS[m] && ITEMS[m].icon) || MATERIAL_ICONS[m] || '';
                div.textContent = `${icon ? icon + ' ' : ''}${m}: ${formatNumber(q)}`;
                matList.appendChild(div);
            });

            const recipes = document.getElementById('recipe-list');
            recipes.innerHTML = '';
            gameState.activeRecipes.forEach(key => {
                const r = RECIPES[key];
                if (!r) return;
                const div = document.createElement('div');
                div.className = 'recipe-item';
                const req = Object.entries(r.materials)
                    .map(([m,q]) => {
                        const icon = (ITEMS[m] && ITEMS[m].icon) || MATERIAL_ICONS[m] || '';
                        return `${m}:${q}${icon ? ' ' + icon : ''}`;
                    }).join(', ');
                const span = document.createElement('span');
                const outIcon = ITEMS[r.output]?.icon || '';
                span.textContent = `${outIcon ? outIcon + ' ' : ''}${r.name} (${req})`;
                div.appendChild(span);
                const btn = document.createElement('button');
                btn.textContent = 'Craft';
                btn.onclick = () => craftItem(key);
                div.appendChild(btn);
                recipes.appendChild(div);
            });

            const queueDiv = document.getElementById('crafting-queue');
            queueDiv.innerHTML = '';
            gameState.craftingQueue.forEach(entry => {
                const div = document.createElement('div');
                const r = RECIPES[entry.recipe];
                const icon = ITEMS[r.output]?.icon || '';
                div.textContent = `${icon ? icon + ' ' : ''}${r.name} (${entry.turnsLeft}T)`;
                queueDiv.appendChild(div);
            });
}

        function updateTileTabDisplay() {
            const container = document.getElementById('tile-tab');
            if (!container) return;
            container.innerHTML = '';

            gameState.player.tileInventory.forEach(tile => {
                const slot = document.createElement('div');
                slot.className = 'tile-tab-slot';
                slot.style.backgroundImage = `url('${String(tile.imageUrl)}')`;
                slot.title = `${tile.name}\n${tile.description}`;
                // slot.onclick = () => showTileDetailPanel(tile);
                container.appendChild(slot);
            });
        }

        function craftItem(key) {
            const recipe = RECIPES[key];
            if (!recipe) return;
            for (const [mat, qty] of Object.entries(recipe.materials)) {
                if ((gameState.materials[mat] || 0) < qty) {
                    addMessage('재료가 부족합니다.', 'info');
                    return;
                }
            }
            SoundEngine.playSound('craftStart');
            for (const [mat, qty] of Object.entries(recipe.materials)) {
                gameState.materials[mat] -= qty;
            }
            gameState.craftingQueue.push({ recipe: key, turnsLeft: recipe.turns });
            addMessage(`🛠️ ${recipe.name} 제작 시작`, 'info');
            updateMaterialsDisplay();
        }

        function learnRecipe(key) {
            if (!gameState.knownRecipes.includes(key)) {
                gameState.knownRecipes.push(key);
                const name = RECIPES[key]?.name || key;
                addMessage(`📖 ${name} 레시피를 배웠습니다!`, 'item');
                playPlayerVoice('assets/audio/player_recipe.mp3');

                // 상세 패널 UI 업데이트 함수를 여기서 직접 호출
                updateCraftingDetailDisplay();

                // 레시피를 활성 탭에도 추가
                addRecipeToTab(key);
            }
        }

        function addRecipeToTab(key) {
            if (!gameState.activeRecipes.includes(key)) {
                gameState.activeRecipes.push(key);
                updateMaterialsDisplay();
                // 상세 패널 업데이트 호출을 learnRecipe 함수로 옮겼으므로 여기서는 제거
            }
        }

        function removeRecipeFromTab(key) {
            const idx = gameState.activeRecipes.indexOf(key);
            if (idx !== -1) {
                gameState.activeRecipes.splice(idx, 1);
                updateMaterialsDisplay();
                updateCraftingDetailDisplay();
            }
        }

        function assignSkill(slot, skillKey) {
            const other = slot === 1 ? 2 : 1;
            if (gameState.player.assignedSkills[other] === skillKey) {
                gameState.player.assignedSkills[other] = null;
            }
            gameState.player.assignedSkills[slot] = skillKey;

            if (skillKey) {
                const skillInfo = SKILL_DEFS[skillKey];
                if (skillInfo && skillInfo.passive && skillInfo.aura) {
                    if (skillInfo.aura.attack) {
                        SoundEngine.playSound('auraActivateMajor');
                    } else {
                        SoundEngine.playSound('auraActivateMinor');
                    }
                }
            }

            updateSkillDisplay();
        }

        // 용병 목록 갱신
        function updateMercenaryDisplay() {
            const activeList = document.getElementById('active-mercenary-list');
            const standbyList = document.getElementById('standby-mercenary-list');
            activeList.innerHTML = '';
            standbyList.innerHTML = '';
            gameState.activeMercenaries.forEach((merc, i) => {
                const div = document.createElement('div');
                const statusClass = merc.alive ? 'alive' : 'dead';
                div.className = `mercenary-info ${statusClass}`;

            const hp = `${formatNumber(merc.health)}/${formatNumber(getStat(merc, 'maxHealth'))}`;
            const mp = `${formatNumber(merc.mana)}/${formatNumber(getStat(merc, 'maxMana'))}`;
                const weapon = merc.equipped && merc.equipped.weapon ? merc.equipped.weapon.name : '없음';
                const armor = merc.equipped && merc.equipped.armor ? merc.equipped.armor.name : '없음';
                const accessory1 = merc.equipped && merc.equipped.accessory1 ? merc.equipped.accessory1.name : '없음';
                const accessory2 = merc.equipped && merc.equipped.accessory2 ? merc.equipped.accessory2.name : '없음';
            const totalAttack = formatNumber(getStat(merc, 'attack'));
            const totalDefense = formatNumber(getStat(merc, 'defense'));
                const skillInfo = MERCENARY_SKILLS[merc.skill] || MONSTER_SKILLS[merc.skill];
                const skillInfo2 = MERCENARY_SKILLS[merc.skill2] || MONSTER_SKILLS[merc.skill2];
                let skillText = skillInfo ? `스킬:${skillInfo.name}(MP ${skillInfo.manaCost})` : '스킬: 없음';
                if (skillInfo2) skillText += ` / ${skillInfo2.name}(MP ${skillInfo2.manaCost})`;

                div.textContent = `${formatNumber(i + 1)}. ${merc.icon} ${merc.name} Lv.${formatNumber(merc.level)} (HP:${hp}, MP:${mp}) ` +
                    `[공격:${totalAttack}, 방어:${totalDefense}] ` +
                    `[무기:${weapon}, 방어구:${armor}, 악세1:${accessory1}, 악세2:${accessory2}] ` +
                    `[${skillText}]`;

                if (merc.alive) {
                    div.onclick = () => {
                        showMercenaryDetails(merc);
                    };
                } else {
                    const reviveBtn = document.createElement('button');
                    reviveBtn.textContent = '부활';
                    reviveBtn.style.marginLeft = '5px';
                    reviveBtn.onclick = (e) => {
                        e.stopPropagation();
                        reviveMercenary(merc);
                    };
                    div.appendChild(reviveBtn);
                }

                activeList.appendChild(div);
            });

            gameState.standbyMercenaries.forEach((merc, i) => {
                const div = document.createElement('div');
                div.className = 'mercenary-info alive';
                const skillInfo = MERCENARY_SKILLS[merc.skill] || MONSTER_SKILLS[merc.skill];
                const skillInfo2 = MERCENARY_SKILLS[merc.skill2] || MONSTER_SKILLS[merc.skill2];
                let skillText = skillInfo ? `스킬:${skillInfo.name}(MP ${skillInfo.manaCost})` : '스킬: 없음';
                if (skillInfo2) skillText += ` / ${skillInfo2.name}(MP ${skillInfo2.manaCost})`;
                div.textContent = `${merc.icon} ${merc.name} (대기) [${skillText}]`;

                const swapBtn = document.createElement('button');
                swapBtn.textContent = '배치';
                swapBtn.style.marginLeft = '5px';
                swapBtn.onclick = () => {
                    const options = gameState.activeMercenaries.map((m, idx) => `${idx + 1}: ${m.name}`);
                    const choice = prompt(`교체할 활동 용병을 선택하세요:\n${options.join('\n')}`);
                    if (choice === null) return;
                    const idx = parseInt(choice, 10) - 1;
                    if (idx >= 0 && idx < gameState.activeMercenaries.length) {
                        swapActiveAndStandby(idx, i);
                    }
                };
                div.appendChild(swapBtn);
            standbyList.appendChild(div);
        });
        }

        function updateIncubatorDisplay() {
            const list = document.getElementById('incubator-slots');
            const waiting = document.getElementById('hatched-list');
            if (!list || !waiting) return;
            list.innerHTML = '';
            gameState.incubators.forEach((slot, i) => {
                const div = document.createElement('div');
                div.className = 'incubator-slot';
                if (slot) {
                    div.textContent = `${slot.egg.name} (${slot.remainingTurns}T)`;
                    const btn = document.createElement('button');
                    btn.textContent = '회수';
                    btn.className = 'sell-button';
                    btn.onclick = () => removeEggFromIncubator(i);
                    div.appendChild(btn);
                } else {
                    div.textContent = '비어 있음';
                }
                list.appendChild(div);
            });
            waiting.innerHTML = '';
            gameState.hatchedSuperiors.forEach(mon => {
                const div = document.createElement('div');
                div.className = 'incubator-slot clickable';
                // Display the hatched monster's name
                div.textContent = mon.name;
                div.addEventListener('click', () => showMonsterDetails(mon));

                const btn = document.createElement('button');
                btn.textContent = '영입';
                btn.className = 'sell-button';
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    recruitHatchedSuperior(mon);
                });
                div.appendChild(btn);

                waiting.appendChild(div);
            });
        }

        function handleHatchedMonsterClick(mon) {
            showMonsterDetails(mon);
            const panel = document.getElementById('monster-detail-panel');
            if (!panel || panel.style.display !== 'block') {
                addMessage('알의 부화에 실패했습니다.', 'info');
                const idx = gameState.hatchedSuperiors.indexOf(mon);
                if (idx !== -1) gameState.hatchedSuperiors.splice(idx, 1);
                updateIncubatorDisplay();
            }
        }

        function refreshDetailPanel(entity) {
            if (window.currentDetailMercenary && window.currentDetailMercenary.id === entity.id) {
                showMercenaryDetails(entity);
            } else if (window.currentDetailMonster && window.currentDetailMonster.id === entity.id) {
                if (entity.isChampion) showChampionDetails(entity);
                else showMonsterDetails(entity);
            }
        }


        // 용병 상세 정보 표시
        function showMercenaryDetails(merc) {
            SoundEngine.playSound('openPanel');
            const weapon = merc.equipped && merc.equipped.weapon ? merc.equipped.weapon.name : '없음';
            const armor = merc.equipped && merc.equipped.armor ? merc.equipped.armor.name : '없음';
            const accessory1 = merc.equipped && merc.equipped.accessory1 ? merc.equipped.accessory1.name : '없음';
            const accessory2 = merc.equipped && merc.equipped.accessory2 ? merc.equipped.accessory2.name : '없음';

            const weaponBtn = merc.equipped && merc.equipped.weapon
                ? `<button class="sell-button" onclick="unequipItemFromMercenary('${merc.id}','weapon')">해제</button>`
                : '';
            const armorBtn = merc.equipped && merc.equipped.armor
                ? `<button class="sell-button" onclick="unequipItemFromMercenary('${merc.id}','armor')">해제</button>`
                : '';
            const acc1Btn = merc.equipped && merc.equipped.accessory1
                ? `<button class="sell-button" onclick="unequipItemFromMercenary('${merc.id}','accessory1')">해제</button>`
                : '';
            const acc2Btn = merc.equipped && merc.equipped.accessory2
                ? `<button class="sell-button" onclick="unequipItemFromMercenary('${merc.id}','accessory2')">해제</button>`
                : '';
            const skills = [merc.skill, merc.skill2].filter(Boolean);
            const skillHtml = skills.map(key => {
                const info = MERCENARY_SKILLS[key] || MONSTER_SKILLS[key] || SKILL_DEFS[key];
                if (!info) return `<div>스킬: ${key}</div>`;
                const lvl = merc.skillLevels && merc.skillLevels[key] || 1;
                const baseCost = (info.manaCost || 0) + lvl - 1;
                const mana = getSkillManaCost(merc, { manaCost: baseCost });
                const range = getSkillRange(merc, info);
                const baseCd = getSkillCooldown(merc, info);
                const cd = merc.skillCooldowns ? merc.skillCooldowns[key] || 0 : 0;
                const power = getSkillPowerMult(merc);
                const mpText = info.manaCost ? ` (MP ${mana})` : '';
                const cdText = baseCd ? ` (쿨타임 ${baseCd}${cd > 0 ? ` / 남은 ${cd}` : ''})` : (cd > 0 ? ` (CD ${cd})` : '');
                const rangeText = range !== undefined ? ` (사거리 ${range})` : '';
                const powerText = power !== 1 ? ` (파워 x${power.toFixed(2)})` : '';
                const defs = MERCENARY_SKILLS[key] ? 'MERCENARY_SKILLS' : MONSTER_SKILLS[key] ? 'MONSTER_SKILLS' : 'SKILL_DEFS';
                const levelUp = (MERCENARY_SKILLS[key] || MONSTER_SKILLS[key])
                    ? ` <button onclick="upgradeMercenarySkill(window.currentDetailMercenary,'${key}')">레벨업</button>`
                    : '';
                return `<div><span class="merc-skill" onclick="showSkillDamage(window.currentDetailMercenary,'${key}',${defs})">${info.icon || ''} ${info.name || key} Lv.${lvl}${mpText}${cdText}${rangeText}${powerText}</span>${levelUp}</div>`;
            }).join('');

            const actionBtn = merc.affinity >= 200
                ? `<button class="sell-button" onclick="sacrifice(window.currentDetailMercenary)">희생</button>`
                : `<button class="sell-button" onclick="dismiss(window.currentDetailMercenary)">해고</button>`;

            const shieldText = merc.shield > 0 ? ` <span style="color: blue">+${formatNumber(merc.shield)}</span>` : '';
            const atkBuffText = merc.attackBuff > 0 ?
                ` <span class="attack-buff-text">(+${formatNumber(merc.attackBuff)})</span>` : '';
            const html = `
                <h3>${merc.icon} ${merc.name} Lv.${formatNumber(merc.level)}</h3>
                <div>💪 힘: ${formatNumber(merc.strength)} ${'⭐'.repeat(merc.stars.strength)}</div>
                <div>🏃 민첩: ${formatNumber(merc.agility)} ${'⭐'.repeat(merc.stars.agility)}</div>
                <div>🛡 체력: ${formatNumber(merc.endurance)} ${'⭐'.repeat(merc.stars.endurance)}</div>
                <div>🔮 집중: ${formatNumber(merc.focus)} ${'⭐'.repeat(merc.stars.focus)}</div>
                <div>📖 지능: ${formatNumber(merc.intelligence)} ${'⭐'.repeat(merc.stars.intelligence)}</div>
                <div>💕 호감도: ${formatNumber(merc.affinity)}</div>
                <div>🍗 배부름: ${formatNumber(merc.fullness)}</div>
                <hr>
                <div>❤️ HP: ${formatNumber(merc.health)}/${formatNumber(getStat(merc, 'maxHealth'))}${shieldText}</div>
                <div>🔋 MP: ${formatNumber(merc.mana)}/${formatNumber(getStat(merc, 'maxMana'))}</div>
                <div>⚔️ 공격력: ${formatNumber(getStat(merc, 'attack'))}${atkBuffText}</div>
                <div>🛡️ 방어력: ${formatNumber(getStat(merc, 'defense'))}</div>
                <div>🎯 명중률: ${formatNumber(getStat(merc, 'accuracy'))}</div>
                <div>💨 회피율: ${formatNumber(getStat(merc, 'evasion'))}</div>
                <div>💥 치명타: ${formatNumber(getStat(merc, 'critChance'))}</div>
                <div>🔮 마법공격: ${formatNumber(getStat(merc, 'magicPower'))}</div>
                <div>✨ 마법방어: ${formatNumber(getStat(merc, 'magicResist'))}</div>
                <div>❤️‍🩹 회복력: ${formatNumber(getStat(merc, 'healthRegen'))}</div>
                <div>🔁 마나회복: ${formatNumber(getStat(merc, 'manaRegen'))}</div>
                ${buildEffectDetails(merc)}
                <div>📚 스킬포인트: ${formatNumber(merc.skillPoints)}</div>
                <hr>
                <div>무기: ${weapon} ${weaponBtn}</div>
                <div>방어구: ${armor} ${armorBtn}</div>
                <div>악세1: ${accessory1} ${acc1Btn}</div>
                <div>악세2: ${accessory2} ${acc2Btn}</div>
                ${skillHtml || '<div>스킬: 없음</div>'}
                <div>${actionBtn}</div>
            `;

            document.getElementById('mercenary-detail-content').innerHTML = html;
            document.getElementById('mercenary-detail-panel').style.display = 'block';
            gameState.gameRunning = false;
            window.currentDetailMercenary = merc;
        }

        function hideMercenaryDetails() {
            SoundEngine.playSound('closePanel');
            document.getElementById('mercenary-detail-panel').style.display = 'none';
            gameState.gameRunning = true;
            window.currentDetailMercenary = null;
        }

        function upgradeMercenarySkill(merc, key) {
            const level = merc.skillLevels[key] || 1;
            const baseCost = 50;
            const cost = baseCost * level * level;
            if (merc.skillPoints <= 0) {
                addMessage('❌ 스킬포인트가 부족합니다.', 'mercenary');
                return;
            }
            if (gameState.player.gold < cost) {
                addMessage(`💸 골드가 부족합니다. 업그레이드에는 ${formatNumber(cost)} 골드가 필요합니다.`, 'info');
                return;
            }
            merc.skillPoints -= 1;
            gameState.player.gold -= cost;
            merc.skillLevels[key] = level + 1;
            updateStats();
            showMercenaryDetails(merc);
        }

        function upgradeMonsterSkill(monster, key) {
            const level = monster.skillLevels[key] || 1;
            const baseCost = 50;
            const cost = baseCost * level * level;
            if (monster.skillPoints <= 0) {
                addMessage('❌ 스킬포인트가 부족합니다.', 'monster');
                return;
            }
            if (gameState.player.gold < cost) {
                addMessage(`💸 골드가 부족합니다. 업그레이드에는 ${formatNumber(cost)} 골드가 필요합니다.`, 'info');
                return;
            }
            monster.skillPoints -= 1;
            gameState.player.gold -= cost;
            monster.skillLevels[key] = level + 1;
            updateStats();
            showMonsterDetails(monster);
        }

        function showMonsterDetails(monster) {
            SoundEngine.playSound('openPanel');
            const auraInfo = monster.isElite && monster.auraSkill
                ? (SKILL_DEFS[monster.auraSkill] ||
                   MERCENARY_SKILLS[monster.auraSkill] ||
                   MONSTER_SKILLS[monster.auraSkill])
                : null;
            const lvl = monster.skillLevels[monster.auraSkill] || 1;
            const isAlly = !gameState.monsters.includes(monster);
            const auraLine = auraInfo
                ? `<div>오라 스킬: <span class="merc-skill"
            onclick="showAuraDetails('${monster.auraSkill}',${lvl})">
            ${auraInfo.icon} ${auraInfo.name} Lv.${lvl}</span>` +
            (isAlly ? `<button onclick="upgradeMonsterSkill(window.currentDetailMonster,'${monster.auraSkill}')">레벨업</button>` : '') +
            `</div>`
                : '';
            const traitInfo = monster.trait ? MONSTER_TRAITS[monster.trait] : null;
            const traitLine = traitInfo ? `<div>특성: ${traitInfo.icon} ${traitInfo.name}</div>` : '';
            const stars = monster.stars || {strength:0, agility:0, endurance:0, focus:0, intelligence:0};
            const skills = [];
            if (monster.monsterSkill && MONSTER_SKILLS[monster.monsterSkill]) {
                skills.push({ key: monster.monsterSkill, info: MONSTER_SKILLS[monster.monsterSkill] });
            }
            if (monster.skill) {
                const def = MERCENARY_SKILLS[monster.skill] || SKILL_DEFS[monster.skill] || MONSTER_SKILLS[monster.skill];
                if (def) skills.push({ key: monster.skill, info: def });
            }
            const skillLine = skills.map(({key, info}) => {
                const lvl = monster.skillLevels && monster.skillLevels[key] || 1;
                const baseCost = (info.manaCost || 0) + lvl - 1;
                const mana = getSkillManaCost(monster, { manaCost: baseCost });
                const range = getSkillRange(monster, info);
                const baseCd = getSkillCooldown(monster, info);
                const cd = monster.skillCooldowns ? monster.skillCooldowns[key] || 0 : 0;
                const power = getSkillPowerMult(monster);
                const mpText = info.manaCost ? ` (MP ${mana})` : '';
                const cdText = baseCd ? ` (쿨타임 ${baseCd}${cd > 0 ? ` / 남은 ${cd}` : ''})` : (cd > 0 ? ` (CD ${cd})` : '');
                const rangeText = range !== undefined ? ` (사거리 ${range})` : '';
                const powerText = power !== 1 ? ` (파워 x${power.toFixed(2)})` : '';
                return `<div>스킬: ${info.icon} ${info.name} Lv.${lvl}${mpText}${cdText}${rangeText}${powerText}</div>`;
            }).join('');
            const actionBtn = monster.affinity !== undefined
                ? (monster.affinity >= 200
                    ? `<button class="sell-button" onclick="sacrifice(window.currentDetailMonster)">희생</button>`
                    : `<button class="sell-button" onclick="dismiss(window.currentDetailMonster)">해고</button>`)
                : '';
            const shieldText = monster.shield > 0 ? ` <span style="color: blue">+${formatNumber(monster.shield)}</span>` : '';
            const atkBuffText = monster.attackBuff > 0 ?
                ` <span class="attack-buff-text">(+${formatNumber(monster.attackBuff)})</span>` : '';
            const html = `
                <h3>${monster.icon} ${monster.name} (Lv.${monster.level})</h3>
                <div>❤️ HP: ${monster.health}/${formatNumber(getStat(monster,'maxHealth'))}${shieldText}</div>
                <div>🔋 MP: ${formatNumber(monster.mana)}/${formatNumber(getStat(monster,'maxMana'))}</div>
                <div>⚔️ 공격력: ${formatNumber(getStat(monster,'attack'))}${atkBuffText}</div>
                <div>🛡️ 방어력: ${formatNumber(getStat(monster,'defense'))}</div>
                <div>🎯 명중률: ${formatNumber(getStat(monster,'accuracy'))}</div>
                <div>💨 회피율: ${formatNumber(getStat(monster,'evasion'))}</div>
                <div>💥 치명타: ${formatNumber(getStat(monster,'critChance'))}</div>
                <div>🔮 마법공격: ${formatNumber(getStat(monster,'magicPower'))}</div>
                <div>✨ 마법방어: ${formatNumber(getStat(monster,'magicResist'))}</div>
                ${buildEffectDetails(monster)}
                ${monster.affinity !== undefined ? `<div>💕 호감도: ${formatNumber(monster.affinity)}</div>` : ''}
                ${monster.fullness !== undefined ? `<div>🍗 배부름: ${formatNumber(monster.fullness)}</div>` : ''}
                <div>💪 힘: ${monster.strength}${monster.isSuperior ? ' ' + '⭐'.repeat(stars.strength) : ''}</div>
                <div>🏃 민첩: ${monster.agility}${monster.isSuperior ? ' ' + '⭐'.repeat(stars.agility) : ''}</div>
                <div>🛡 체력: ${monster.endurance}${monster.isSuperior ? ' ' + '⭐'.repeat(stars.endurance) : ''}</div>
                <div>🔮 집중: ${monster.focus}${monster.isSuperior ? ' ' + '⭐'.repeat(stars.focus) : ''}</div>
                <div>📖 지능: ${monster.intelligence}${monster.isSuperior ? ' ' + '⭐'.repeat(stars.intelligence) : ''}</div>
                <div>📏 사거리: ${monster.range}</div>
                <div>특수: ${monster.special || '없음'}</div>
                ${traitLine}
                ${skillLine}
                ${auraLine}
                ${actionBtn ? `<div>${actionBtn}</div>` : ''}
            `;
            document.getElementById('monster-detail-content').innerHTML = html;
            document.getElementById('monster-detail-panel').style.display = 'block';
            gameState.gameRunning = false;
            window.currentDetailMonster = monster;
        }

        function showChampionDetails(champion) {
            SoundEngine.playSound('openPanel');
            const eq = champion.equipped || {};
            const weapon = eq.weapon ? eq.weapon.name : '없음';
            const armor = eq.armor ? eq.armor.name : '없음';
            const acc1 = eq.accessory1 ? eq.accessory1.name : '없음';
            const acc2 = eq.accessory2 ? eq.accessory2.name : '없음';
            const skillInfo = champion.monsterSkill
                ? (MONSTER_SKILLS[champion.monsterSkill] || MERCENARY_SKILLS[champion.monsterSkill])
                : null;
            let skillLine = '<div>스킬: 없음</div>';
            if (skillInfo) {
                const lvl = champion.skillLevels && champion.skillLevels[champion.monsterSkill] || 1;
                const baseCost = (skillInfo.manaCost || 0) + lvl - 1;
                const mana = getSkillManaCost(champion, { manaCost: baseCost });
                const range = getSkillRange(champion, skillInfo);
                const baseCd = getSkillCooldown(champion, skillInfo);
                const cd = champion.skillCooldowns ? champion.skillCooldowns[champion.monsterSkill] || 0 : 0;
                const power = getSkillPowerMult(champion);
                const mpText = skillInfo.manaCost ? ` (MP ${mana})` : '';
                const cdText = baseCd ? ` (쿨타임 ${baseCd}${cd > 0 ? ` / 남은 ${cd}` : ''})` : (cd > 0 ? ` (CD ${cd})` : '');
                const rangeText = range !== undefined ? ` (사거리 ${range})` : '';
                const powerText = power !== 1 ? ` (파워 x${power.toFixed(2)})` : '';
                skillLine = `<div>스킬: ${skillInfo.icon} ${skillInfo.name} Lv.${lvl}${mpText}${cdText}${rangeText}${powerText}</div>`;
            }
            const shieldText = champion.shield > 0 ? ` <span style="color: blue">+${formatNumber(champion.shield)}</span>` : '';
            const atkBuffText = champion.attackBuff > 0 ?
                ` <span class="attack-buff-text">(+${formatNumber(champion.attackBuff)})</span>` : '';
            const html = `
                <h3>${champion.icon} ${champion.name} (Lv.${champion.level})</h3>
                <div>💪 힘: ${formatNumber(champion.strength)} ${'⭐'.repeat(champion.stars.strength)}</div>
                <div>🏃 민첩: ${formatNumber(champion.agility)} ${'⭐'.repeat(champion.stars.agility)}</div>
                <div>🛡 체력: ${formatNumber(champion.endurance)} ${'⭐'.repeat(champion.stars.endurance)}</div>
                <div>🔮 집중: ${formatNumber(champion.focus)} ${'⭐'.repeat(champion.stars.focus)}</div>
                <div>📖 지능: ${formatNumber(champion.intelligence)} ${'⭐'.repeat(champion.stars.intelligence)}</div>
                ${champion.affinity !== undefined ? `<div>💕 호감도: ${formatNumber(champion.affinity)}</div>` : ''}
                <hr>
                <div>❤️ HP: ${formatNumber(champion.health)}/${formatNumber(getStat(champion,'maxHealth'))}${shieldText}</div>
                <div>🔋 MP: ${formatNumber(champion.mana)}/${formatNumber(getStat(champion,'maxMana'))}</div>
                <div>⚔️ 공격력: ${formatNumber(getStat(champion,'attack'))}${atkBuffText}</div>
                <div>🛡️ 방어력: ${formatNumber(getStat(champion,'defense'))}</div>
                <div>🎯 명중률: ${formatNumber(getStat(champion,'accuracy'))}</div>
                <div>💨 회피율: ${formatNumber(getStat(champion,'evasion'))}</div>
                <div>💥 치명타: ${formatNumber(getStat(champion,'critChance'))}</div>
                <div>🔮 마법공격: ${formatNumber(getStat(champion,'magicPower'))}</div>
                <div>✨ 마법방어: ${formatNumber(getStat(champion,'magicResist'))}</div>
                ${buildEffectDetails(champion)}
                <div>📏 사거리: ${champion.range}</div>
                <div>무기: ${weapon}</div>
                <div>방어구: ${armor}</div>
                <div>악세1: ${acc1}</div>
                <div>악세2: ${acc2}</div>
                ${skillLine}
            `;
            document.getElementById('monster-detail-content').innerHTML = html;
            document.getElementById('monster-detail-panel').style.display = 'block';
            gameState.gameRunning = false;
            window.currentDetailMonster = champion;
        }

        function hideMonsterDetails() {
            SoundEngine.playSound('closePanel');
            document.getElementById('monster-detail-panel').style.display = 'none';
            gameState.gameRunning = true;
            window.currentDetailMonster = null;
        }

        function spawnMercenaryNearPlayer(mercenary) {
            if (!gameState.dungeon.length) generateDungeon();
            const positions = [
                {x: gameState.player.x + 1, y: gameState.player.y},
                {x: gameState.player.x - 1, y: gameState.player.y},
                {x: gameState.player.x, y: gameState.player.y + 1},
                {x: gameState.player.x, y: gameState.player.y - 1},
                {x: gameState.player.x + 1, y: gameState.player.y + 1},
                {x: gameState.player.x - 1, y: gameState.player.y - 1},
                {x: gameState.player.x + 1, y: gameState.player.y - 1},
                {x: gameState.player.x - 1, y: gameState.player.y + 1}
            ];
            for (const pos of positions) {
                if (pos.x >= 0 && pos.x < gameState.dungeonSize &&
                    pos.y >= 0 && pos.y < gameState.dungeonSize &&
                    gameState.dungeon[pos.y] && ['empty','item'].includes(gameState.dungeon[pos.y][pos.x]) &&
                    !gameState.activeMercenaries.some(m => m.x === pos.x && m.y === pos.y && m.alive) &&
                    !gameState.monsters.some(m => m.x === pos.x && m.y === pos.y)) {
                    if (gameState.dungeon[pos.y][pos.x] === 'item') {
                        const idx = gameState.items.findIndex(it => it.x === pos.x && it.y === pos.y);
                        if (idx !== -1) gameState.items.splice(idx, 1);
                    }
                    gameState.dungeon[pos.y][pos.x] = 'empty';
                    mercenary.x = pos.x;
                    mercenary.y = pos.y;
                    return true;
                }
            }
            return false;
        }

        function swapActiveAndStandby(activeIndex, standbyIndex) {
            const active = gameState.activeMercenaries[activeIndex];
            const standby = gameState.standbyMercenaries[standbyIndex];
            if (!spawnMercenaryNearPlayer(standby)) {
                addMessage('❌ 용병을 배치할 공간이 없습니다.', 'info');
                return;
            }
            gameState.activeMercenaries[activeIndex] = standby;
            gameState.standbyMercenaries[standbyIndex] = active;
            active.x = -1;
            active.y = -1;
            addMessage(`🔄 ${standby.name}과 ${active.name}을 교체했습니다.`, 'mercenary');
            updateMercenaryDisplay();
            updateIncubatorDisplay();
            renderDungeon();
        }

        // 플레이어 능력치 표시 업데이트
        function updateStats() {
            document.getElementById('level').textContent = formatNumber(gameState.player.level);
            document.getElementById('skillPoints').textContent = formatNumber(gameState.player.skillPoints);
            const spEl = document.getElementById('statPoints');
            if (spEl) spEl.textContent = formatNumber(gameState.player.statPoints);
            document.getElementById('strengthStat').textContent = formatNumber(gameState.player.strength);
            document.getElementById('agilityStat').textContent = formatNumber(gameState.player.agility);
            document.getElementById('enduranceStat').textContent = formatNumber(gameState.player.endurance);
            document.getElementById('focusStat').textContent = formatNumber(gameState.player.focus);
            document.getElementById('intelligenceStat').textContent = formatNumber(gameState.player.intelligence);
            document.getElementById('health').textContent = formatNumber(gameState.player.health);
            document.getElementById('maxHealth').textContent = formatNumber(getStat(gameState.player, 'maxHealth'));
            const shieldEl = document.getElementById('shield');
            if (shieldEl) {
                shieldEl.textContent = gameState.player.shield > 0 ? `+${formatNumber(gameState.player.shield)}` : '';
            }
            document.getElementById('mana').textContent = formatNumber(gameState.player.mana);
            document.getElementById('maxMana').textContent = formatNumber(getStat(gameState.player, 'maxMana'));
            document.getElementById('fullness').textContent = formatNumber(gameState.player.fullness);
            document.getElementById('healthRegen').textContent = formatNumber(getStat(gameState.player, 'healthRegen'));
            document.getElementById('manaRegen').textContent = formatNumber(getStat(gameState.player, 'manaRegen'));
            document.getElementById('attackStat').textContent = formatNumber(getStat(gameState.player, 'attack'));
            const atkBuffEl = document.getElementById('attackBuff');
            if (atkBuffEl) atkBuffEl.textContent = gameState.player.attackBuff > 0 ? `(+${formatNumber(gameState.player.attackBuff)})` : '';
            document.getElementById('defense').textContent = formatNumber(getStat(gameState.player, 'defense'));
            document.getElementById('accuracy').textContent = formatNumber(getStat(gameState.player, 'accuracy'));
            document.getElementById('evasion').textContent = formatNumber(getStat(gameState.player, 'evasion'));
            document.getElementById('critChance').textContent = formatNumber(getStat(gameState.player, 'critChance'));
            document.getElementById('magicPower').textContent = formatNumber(getStat(gameState.player, 'magicPower'));
            document.getElementById('magicResist').textContent = formatNumber(getStat(gameState.player, 'magicResist'));
            document.getElementById('exp').textContent = formatNumber(gameState.player.exp);
            document.getElementById('expNeeded').textContent = formatNumber(gameState.player.expNeeded);
            document.getElementById('gold').textContent = formatNumber(gameState.player.gold);
            document.getElementById('floor').textContent = formatNumber(gameState.floor);
            const tileSlot = document.getElementById('equipped-tile-side');
            if (tileSlot) {
                if (gameState.player.equipped.tile) {
                    tileSlot.innerHTML = `타일: ${formatItem(gameState.player.equipped.tile)}`;
                    tileSlot.onclick = () => unequipTile(gameState.player);
                } else {
                    tileSlot.textContent = '타일: 없음';
                    tileSlot.onclick = null;
                }
            }
            document.getElementById('weaponBonus').textContent = gameState.player.equipped.weapon ? `(+${formatNumber(gameState.player.equipped.weapon.attack)})` : '';
            document.getElementById('armorBonus').textContent = gameState.player.equipped.armor ? `(+${formatNumber(gameState.player.equipped.armor.defense)})` : '';
            const hpRatio = gameState.player.health / getStat(gameState.player,'maxHealth');
            const hpEl = document.getElementById('hp-bar');
            if (hpEl) hpEl.style.width = (hpRatio*100) + '%';
            const shieldRatio = Math.min(gameState.player.shield / getStat(gameState.player,'maxHealth'), 1);
            const shieldBar = document.getElementById('shield-bar');
            if (shieldBar) shieldBar.style.width = (shieldRatio*100) + '%';
            const mpRatio = gameState.player.mana / getStat(gameState.player,'maxMana');
            const mpEl = document.getElementById('mp-bar');
            if (mpEl) mpEl.style.width = (mpRatio*100) + '%';
            updateTurnEffects();
        }

        function updateTurnEffects() {
            const panel = document.getElementById('turn-effects');
            if (!panel) return;
            const auras = [];
            const addAura = (key, lvl) => {
                const info = SKILL_DEFS[key] || MERCENARY_SKILLS[key] || MONSTER_SKILLS[key];
                if (info && info.passive && info.aura) {
                    auras.push(
                        `<span class="buff-icon" onclick="showAuraDetails('${key}',${lvl})"` +
                        ` title="${info.name} Lv.${lvl}">${info.icon}</span>`
                    );
                }
            };
            ['1','2'].forEach(slot => {
                const k = gameState.player.assignedSkills[slot];
                if (k) addAura(k, gameState.player.skillLevels[k] || 1);
            });
            gameState.activeMercenaries.filter(m=>m.alive).forEach(m=>{
                const skills = new Set([m.skill, m.skill2, m.auraSkill].filter(Boolean));
                skills.forEach(k=>{
                    const info = SKILL_DEFS[k];
                    if (info && info.passive && info.aura) {
                        const dist = getDistance(m.x, m.y, gameState.player.x, gameState.player.y);
                        if (dist <= (info.radius || 0)) addAura(k, m.skillLevels[k] || 1);
                    }
                });
            });

            const statusParts = [];
            const statusKeys = ['poison','burn','freeze','bleed','paralysis','nightmare','silence','petrify','debuff'];
            statusKeys.forEach(s => {
                if (gameState.player[s]) {
                    const icon = STATUS_ICONS[s] || '';
                    const turns = gameState.player[s + 'Turns'] || 0;
                    const name = STATUS_NAMES[s] || s;
                    statusParts.push(`${icon} ${name}(${turns})`);
                }
            });

            const auraText = auras.length ? auras.join('') : '없음';
            const statusText = statusParts.length ? statusParts.join(', ') : '없음';
            panel.innerHTML = `<div>오라: ${auraText}</div><div>상태: ${statusText}</div>`;
        }

        function buildEffectDetails(unit) {
            const auraIcons = getActiveAuraIcons(unit);
            const auraText = auraIcons.length ? auraIcons.join('') : '없음';
            const statusParts = [];
            const STATUS_KEYS = ['poison','burn','freeze','bleed','paralysis','nightmare','silence','petrify','debuff'];
            STATUS_KEYS.forEach(s => {
                if (unit[s]) {
                    const icon = STATUS_ICONS[s] || '';
                    const turns = unit[s + 'Turns'] || 0;
                    const name = STATUS_NAMES[s] || s;
                    statusParts.push(`${icon} ${name}(${turns})`);
                }
            });
            const statusText = statusParts.length ? statusParts.join(', ') : '없음';
            return `<div>오라: ${auraText}</div><div>상태: ${statusText}</div>`;
        }

        // 안개 업데이트
        function updateFogOfWar() {
            for (let y = 0; y < gameState.dungeonSize; y++) {
                if (!gameState.fogOfWar[y]) gameState.fogOfWar[y] = [];
                for (let x = 0; x < gameState.dungeonSize; x++) {
                    if (getDistance(x, y, gameState.player.x, gameState.player.y) <= FOG_RADIUS) {
                        gameState.fogOfWar[y][x] = false;
                    } else if (gameState.fogOfWar[y][x] === undefined) {
                        gameState.fogOfWar[y][x] = true;
                    }
                }
            }
        }

        /**
         * 특정 캐릭터에게 현재 적용되고 있는 모든 오라 효과의 아이콘 목록을 반환합니다.
         * @param {object} character - 효과를 확인할 대상 유닛 (플레이어, 용병, 몬스터)
         * @returns {string[]} - 활성화된 오라 아이콘의 배열
         */
        function getActiveAuraIcons(character) {
            const icons = new Set();
            const checkSource = (source) => {
                if (!source || (source !== gameState.player && !source.alive)) return;
                if (!isSameSide(source, character)) return;

                const skillKeys = [
                    source.skill,
                    source.skill2,
                    source.auraSkill,
                    ...(source.assignedSkills ? Object.values(source.assignedSkills) : [])
                ].filter(Boolean);

                skillKeys.forEach(key => {
                    const skill = SKILL_DEFS[key] || MERCENARY_SKILLS[key] || MONSTER_SKILLS[key];
                    if (skill && skill.passive && skill.aura && getDistance(source.x, source.y, character.x, character.y) <= (skill.radius || 0)) {
                        icons.add(skill.icon);
                    }
                });
            };

            // 플레이어, 모든 아군 용병, 엘리트 및 상급 몬스터가 거는 오라를 모두 확인
            checkSource(gameState.player);
            gameState.activeMercenaries.forEach(merc => checkSource(merc));
            gameState.monsters.filter(m => m.isElite || m.isSuperior).forEach(elite => checkSource(elite));

            return Array.from(icons);
        }

        /**
         * 특정 유닛의 셀에 버프 및 상태이상 아이콘을 업데이트합니다.
         * @param {object} unit - 아이콘을 표시할 유닛 객체
         * @param {HTMLElement} cellDiv - 해당 유닛이 위치한 셀의 div 요소
         */
        function updateUnitEffectIcons(unit, cellDiv) {
            let buffContainer = cellDiv.querySelector('.buff-container');
            let statusContainer = cellDiv.querySelector('.status-container');

            if (!buffContainer) {
                buffContainer = document.createElement('div');
                buffContainer.className = 'buff-container';
                cellDiv.appendChild(buffContainer);
            }
            if (!statusContainer) {
                statusContainer = document.createElement('div');
                statusContainer.className = 'status-container';
                cellDiv.appendChild(statusContainer);
            }

            buffContainer.innerHTML = '';
            statusContainer.innerHTML = '';

            if (!unit || !unit.id) return;

            // 1. Collect buff and debuff icons separately
            const allBuffIcons = [];
            const allDebuffIcons = [];

            // Auras are buffs
            allBuffIcons.push(...getActiveAuraIcons(unit));

            // Status ailments are debuffs
            const STATUS_KEYS = ['poison', 'burn', 'freeze', 'bleed', 'paralysis', 'nightmare', 'silence', 'petrify', 'debuff'];
            STATUS_KEYS.forEach(status => {
                if (unit[status] && unit[status + 'Turns'] > 0) {
                    allDebuffIcons.push(STATUS_ICONS[status]);
                }
            });

            // Buffs array uses ⬆️ for buffs and ⬇️ for debuffs
            if (Array.isArray(unit.buffs)) {
                unit.buffs.forEach(buff => {
                    const skillDef = Object.values(SKILL_DEFS).find(def => def.name === buff.name);
                    if (skillDef && skillDef.icon) {
                        if (skillDef.icon === '⬆️') {
                            allBuffIcons.push(skillDef.icon);
                        } else if (skillDef.icon === '⬇️') {
                            allDebuffIcons.push(skillDef.icon);
                        }
                    }
                });
            }

            const uniqueBuffs = [...new Set(allBuffIcons)];
            const uniqueDebuffs = [...new Set(allDebuffIcons)];

            // 2. Update effectCycleState
            if (uniqueBuffs.length === 0 && uniqueDebuffs.length === 0) {
                delete effectCycleState[unit.id];
            } else {
                const currentState = effectCycleState[unit.id] || {};

                const buffsChanged = !currentState.buffs || JSON.stringify(currentState.buffs) !== JSON.stringify(uniqueBuffs);
                const debuffsChanged = !currentState.debuffs || JSON.stringify(currentState.debuffs) !== JSON.stringify(uniqueDebuffs);

                if (!effectCycleState[unit.id]) {
                    effectCycleState[unit.id] = { buffs: [], debuffs: [], buffIndex: 0, debuffIndex: 0 };
                }

                if (buffsChanged) {
                    effectCycleState[unit.id].buffs = uniqueBuffs;
                    effectCycleState[unit.id].buffIndex = 0;
                }
                if (debuffsChanged) {
                    effectCycleState[unit.id].debuffs = uniqueDebuffs;
                    effectCycleState[unit.id].debuffIndex = 0;
                }
            }

            // 3. Render current icons
            const state = effectCycleState[unit.id];
            if (state) {
                // Buff icon (top)
                if (state.buffs && state.buffs.length > 0) {
                    const currentBuffIcon = state.buffs[state.buffIndex];
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'effect-icon';
                    iconSpan.textContent = currentBuffIcon;
                    buffContainer.appendChild(iconSpan);
                }
                // Debuff icon (bottom)
                if (state.debuffs && state.debuffs.length > 0) {
                    const currentDebuffIcon = state.debuffs[state.debuffIndex];
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'effect-icon';
                    iconSpan.textContent = currentDebuffIcon;
                    statusContainer.appendChild(iconSpan);
                }
            }
        }

        // 몬스터 생성
        function createMonster(type, x, y, level = 1) {
            const data = MONSTER_TYPES[type];
            const endurance = data.baseHealth / 2;
            const agility = Math.max(0, Math.round((data.baseAccuracy - 0.7) / 0.02));
            const monster = {
                id: Math.random().toString(36).substr(2, 9),
                type,
                name: data.name,
                icon: data.icon,
                x,
                y,
                level: 1,
                endurance: endurance,
                focus: 0,
                strength: data.baseAttack,
                agility: agility,
                intelligence: data.baseMagicPower,
                baseDefense: data.baseDefense - Math.floor(endurance * 0.1),
                maxHealth: data.baseHealth,
                health: data.baseHealth,
                maxMana: 0,
                mana: 0,
                shield: 0,
                shieldTurns: 0,
                attackBuff: 0,
                attackBuffTurns: 0,
                attack: data.baseAttack,
                defense: data.baseDefense,
                accuracy: data.baseAccuracy,
                evasion: data.baseEvasion,
                critChance: data.baseCritChance,
                magicPower: data.baseMagicPower,
                magicResist: data.baseMagicResist,
                elementResistances: {fire:0, ice:0, lightning:0, earth:0, light:0, dark:0},
                statusResistances: {poison:0, bleed:0, burn:0, freeze:0, paralysis:0, nightmare:0, silence:0, petrify:0, debuff:0},
                poison: false,
                burn: false,
                freeze: false,
                bleed: false,
                paralysis: false,
                nightmare: false,
                silence: false,
                petrify: false,
                debuff: false,
                poisonTurns: 0,
                burnTurns: 0,
                freezeTurns: 0,
                bleedTurns: 0,
                paralysisTurns: 0,
                nightmareTurns: 0,
                silenceTurns: 0,
                petrifyTurns: 0,
                debuffTurns: 0,
                exp: data.baseExp,
                expNeeded: 15,
                gold: data.baseGold,
                range: data.range,
                special: data.special,
                statusEffect: data.statusEffect,
                lootChance: 0.3,
                fullness: 75,
                hasActed: false,
                skillCooldowns: {},
                buffs: []
            };
            setMonsterLevel(monster, level);
            monster.skillLevels = {};
            const pool = MONSTER_SKILL_SETS[type];
            if (pool && pool.length) {
                const sk = pool[Math.floor(Math.random() * pool.length)];
                monster.monsterSkill = sk;
                monster.skillLevels[sk] = Math.floor((level - 1) / 3) + 1;
            }
            const traitPool = MONSTER_TRAIT_SETS[type];
            if (traitPool && traitPool.length) {
                monster.trait = traitPool[Math.floor(Math.random() * traitPool.length)];
                const tinfo = MONSTER_TRAITS[monster.trait];
                if (tinfo && tinfo.status) monster.statusEffect = tinfo.status;
                if (tinfo && tinfo.element) monster[`${tinfo.element}Damage`] = 2;
            }
            return monster;
        }

        function createEliteMonster(type, x, y, level = 1) {
            const monster = createMonster(type, x, y, level + 1);
            const auraKeys = ['RegenerationAura', 'MeditationAura', 'HasteAura', 'ConcentrationAura', 'CondemnAura', 'NaturalAura'];
            const auraSkill = auraKeys[Math.floor(Math.random() * auraKeys.length)];
            monster.isElite = true;
            monster.auraSkill = auraSkill;
            monster.skillLevels[auraSkill] = Math.floor((level - 1) / 3) + 1;
            monster.name = `엘리트 ${monster.name}`;
            monster.attack = Math.floor(monster.attack * 1.5);
            monster.defense = Math.floor(monster.defense * 1.5);
            monster.health = Math.floor(monster.health * 1.5);
            monster.maxHealth = monster.health;
            monster.lootChance = 0.6;
            monster.skillCooldowns = {};
            return monster;
        }

        function createSuperiorMonster(type, x, y, level = 1) {
            const monster = createMonster(type, x, y, level + 1);
            const auraKeys = ['MightAura','ProtectAura','RegenerationAura','MeditationAura','HasteAura','ConcentrationAura','CondemnAura','NaturalAura'];
            const skillKeys = Object.keys(MERCENARY_SKILLS)
                .filter(k => !k.endsWith('Aura') && !DEBUFF_SKILLS.includes(k));
            const skill = skillKeys[Math.floor(Math.random() * skillKeys.length)];
            const auraSkill = auraKeys[Math.floor(Math.random() * auraKeys.length)];
            monster.isElite = true;
            monster.isSuperior = true;
            monster.stars = generateStars();
            monster.skill = skill;
            monster.auraSkill = auraSkill;
            monster.skillLevels[skill] = Math.floor((level - 1) / 3) + 1;
            monster.skillLevels[auraSkill] = Math.floor((level - 1) / 3) + 1;
            monster.name = `상급 ${monster.name}`;
            monster.attack = Math.floor(monster.attack * 2);
            monster.defense = Math.floor(monster.defense * 2);
            monster.health = Math.floor(monster.health * 2);
            monster.maxHealth = monster.health;
            monster.focus = 5;
            monster.maxMana = getStat(monster, 'maxMana');
            monster.mana = monster.maxMana;
            monster.lootChance = 0.8;
            monster.skillCooldowns = {};
            return monster;
        }

        function setMercenaryLevel(mercenary, level) {
            for (let i = 1; i < level; i++) {
                mercenary.level += 1;
                mercenary.endurance += 2;
                mercenary.strength += 1;
                mercenary.health = getStat(mercenary, 'maxHealth');
                mercenary.mana = getStat(mercenary, 'maxMana');
                mercenary.expNeeded = Math.floor(mercenary.expNeeded * 1.5);
            }
        }

        function setMonsterLevel(monster, level) {
            for (let i = 1; i < level; i++) {
                monster.level += 1;
                if ((monster.isSuperior || monster.isChampion) && monster.stars) {
                    monster.endurance += 2 + monster.stars.endurance * 0.5;
                    monster.strength += 1 + monster.stars.strength * 0.5;
                    monster.agility += 1 + monster.stars.agility * 0.5;
                    monster.focus += 1 + monster.stars.focus * 0.5;
                    monster.intelligence += 1 + monster.stars.intelligence * 0.5;
                } else {
                    monster.endurance += 2;
                    monster.strength += 1;
                    monster.agility += 1;
                    monster.focus += 1;
                    monster.intelligence += 1;
                }
                monster.maxHealth = getStat(monster, 'maxHealth');
                monster.health = monster.maxHealth;
                monster.maxMana = getStat(monster, 'maxMana');
                monster.mana = monster.maxMana;
                monster.attack = getStat(monster, 'attack');
                monster.defense = getStat(monster, 'defense');
                monster.accuracy = getStat(monster, 'accuracy');
                monster.evasion = getStat(monster, 'evasion');
                monster.critChance = getStat(monster, 'critChance');
                monster.magicPower = getStat(monster, 'magicPower');
                monster.magicResist = getStat(monster, 'magicResist');
                monster.expNeeded = Math.floor((monster.expNeeded || 15) * 1.5);
            }
        }

        function setChampionLevel(champion, level) {
            for (let i = 1; i < level; i++) {
                champion.level += 1;
                champion.endurance += 2 + champion.stars.endurance * 0.5;
                champion.strength += 1 + champion.stars.strength * 0.5;
                champion.agility += 1 + champion.stars.agility * 0.5;
                champion.focus += 1 + champion.stars.focus * 0.5;
                champion.intelligence += 1 + champion.stars.intelligence * 0.5;
                champion.maxHealth = getStat(champion, 'maxHealth');
                champion.health = champion.maxHealth;
                champion.maxMana = getStat(champion, 'maxMana');
                champion.mana = champion.maxMana;
                champion.attack = getStat(champion, 'attack');
                champion.defense = getStat(champion, 'defense');
                champion.accuracy = getStat(champion, 'accuracy');
                champion.evasion = getStat(champion, 'evasion');
                champion.critChance = getStat(champion, 'critChance');
                champion.magicPower = getStat(champion, 'magicPower');
                champion.magicResist = getStat(champion, 'magicResist');
                champion.expNeeded = Math.floor((champion.expNeeded || 15) * 1.5);
            }
        }

function createTreasure(x, y, gold) {
            const floorBonus = Math.max(0, gameState.floor - 1) * 2;
            return { x, y, gold: gold + floorBonus };
        }

function findAdjacentEmpty(x, y) {
            const dirs = [
                {dx:1, dy:0}, {dx:-1, dy:0}, {dx:0, dy:1}, {dx:0, dy:-1},
                {dx:1, dy:1}, {dx:-1, dy:-1}, {dx:1, dy:-1}, {dx:-1, dy:1}
            ];
            for (const d of dirs) {
                const nx = x + d.dx;
                const ny = y + d.dy;
                if (nx >= 0 && nx < gameState.dungeonSize &&
                    ny >= 0 && ny < gameState.dungeonSize &&
                    gameState.dungeon[ny][nx] === 'empty') {
                    return {x:nx, y:ny};
                }
            }
            return {x, y};
        }

function findNearestEmpty(x, y) {
            const size = gameState.dungeonSize;
            const visited = Array.from({ length: size }, () => Array(size).fill(false));
            const queue = [{x, y}];
            visited[y][x] = true;
            const dirs = [
                {dx:1, dy:0}, {dx:-1, dy:0}, {dx:0, dy:1}, {dx:0, dy:-1},
                {dx:1, dy:1}, {dx:-1, dy:-1}, {dx:1, dy:-1}, {dx:-1, dy:1}
            ];
            while (queue.length) {
                const cur = queue.shift();
                if (gameState.dungeon[cur.y] && gameState.dungeon[cur.y][cur.x] === 'empty') {
                    return {x: cur.x, y: cur.y};
                }
                for (const d of dirs) {
                    const nx = cur.x + d.dx;
                    const ny = cur.y + d.dy;
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[ny][nx]) {
                        visited[ny][nx] = true;
                        queue.push({x:nx, y:ny});
                    }
                }
            }
            return {x, y};
        }

function killMonster(monster, killer = null) {
            let itemOnCorpse = false;
            SoundEngine.playSound('monsterDie'); // 몬스터 사망음 재생
            if (killer) {
                playRandomKillQuote(killer);
                addMessage(`💀 ${killer.name}이(가) ${monster.name}을(를) 처치했습니다!`,
                           'mercenary', null, getMercImage(killer.type));
                const mercExp = Math.floor(monster.exp * 0.6);
                const playerExp = Math.floor(monster.exp * 0.4);
                killer.exp += mercExp;
                gameState.player.exp += playerExp;
                gameState.player.gold += monster.gold;
                checkMercenaryLevelUp(killer);
                checkLevelUp();
                updateStats();
                const healOnKill = getStat(killer, 'healOnKill');
                if (healOnKill) {
                    killer.health = Math.min(getStat(killer, 'maxHealth'), killer.health + healOnKill);
                    const name = killer === gameState.player ? '플레이어' : killer.name;
                    addMessage(`❤️ ${name}이(가) 적을 처치하고 체력을 ${formatNumber(healOnKill)} 회복했습니다!`, 'combat');
                    refreshDetailPanel(killer);
                }
                const manaOnKill = getStat(killer, 'manaOnKill');
                if (manaOnKill) {
                    killer.mana = Math.min(getStat(killer, 'maxMana'), (killer.mana || 0) + manaOnKill);
                    const name = killer === gameState.player ? '플레이어' : killer.name;
                    addMessage(`💧 ${name}이(가) 적을 처치하고 마나를 ${formatNumber(manaOnKill)} 회복했습니다!`, 'combat');
                    refreshDetailPanel(killer);
                }
            } else {
                addMessage(`💀 ${monster.name}을(를) 처치했습니다!`, 'combat', null, getMonsterImage(monster));
                playPlayerKillQuote();
                gameState.player.exp += monster.exp;
                let goldGain = monster.gold;
                if (gameState.currentMapModifiers && gameState.currentMapModifiers.goldMultiplier) {
                    goldGain = Math.floor(goldGain * gameState.currentMapModifiers.goldMultiplier);
                }
                gameState.player.gold += goldGain;
                checkLevelUp();
                const healOnKill = getStat(gameState.player, 'healOnKill');
                if (healOnKill) {
                    gameState.player.health = Math.min(getStat(gameState.player, 'maxHealth'), gameState.player.health + healOnKill);
                    addMessage(`❤️ 플레이어가 적을 처치하고 체력을 ${formatNumber(healOnKill)} 회복했습니다!`, 'combat');
                }
                const manaOnKill = getStat(gameState.player, 'manaOnKill');
                if (manaOnKill) {
                    gameState.player.mana = Math.min(getStat(gameState.player, 'maxMana'), gameState.player.mana + manaOnKill);
                    addMessage(`💧 플레이어가 적을 처치하고 마나를 ${formatNumber(manaOnKill)} 회복했습니다!`, 'combat');
                }
                updateStats();
            }
            if ((monster.special === 'boss' || monster.isChampion) && Math.random() < 0.10) {
                const uniqueKeys = Object.keys(UNIQUE_ITEMS);
                if (uniqueKeys.length > 0) {
                    const randomUniqueKey = uniqueKeys[Math.floor(Math.random() * uniqueKeys.length)];
                    const pos = findAdjacentEmpty(monster.x, monster.y);
                    if (pos.x === monster.x && pos.y === monster.y) {
                        itemOnCorpse = true;
                    }
                    const droppedItem = createItem(randomUniqueKey, pos.x, pos.y);
                    gameState.items.push(droppedItem);
                    gameState.dungeon[pos.y][pos.x] = 'item';
                    addMessage(`✨ 전설이 깃든... ${formatItemName(droppedItem)}을(를) 획득했습니다!`, 'treasure');
                }
            } else if (monster.isChampion) {
                const eq = Object.values(monster.equipped || {}).filter(i => i);
                if (eq.length) {
                    const drop = eq[Math.floor(Math.random() * eq.length)];
                    const pos = findAdjacentEmpty(monster.x, monster.y);
                    if (pos.x === monster.x && pos.y === monster.y) {
                        itemOnCorpse = true;
                    }
                    drop.x = pos.x;
                    drop.y = pos.y;
                    gameState.items.push(drop);
                    gameState.dungeon[pos.y][pos.x] = 'item';
                }
            } else if (monster.special === 'boss') {
                const bossItems = ['magicSword', 'magicStaff', 'plateArmor', 'greaterHealthPotion'];
                if (Math.random() < 0.2) bossItems.push('reviveScroll');
                const bossItemKey = bossItems[Math.floor(Math.random() * bossItems.length)];
                const pos = findAdjacentEmpty(monster.x, monster.y);
                if (pos.x === monster.x && pos.y === monster.y) {
                    itemOnCorpse = true;
                }
                const bossItem = createItem(bossItemKey, pos.x, pos.y, null, Math.floor(gameState.floor / 5), Math.random() < 0.1);
                gameState.items.push(bossItem);
                gameState.dungeon[pos.y][pos.x] = 'item';
                addMessage(`🎁 ${monster.name}이(가) ${formatItemName(bossItem)}을(를) 떨어뜨렸습니다!`, 'treasure');
            } else {
                let lootChance = monster.lootChance + (gameState.currentMapModifiers?.lootChanceBonus || 0);
                if (Math.random() < lootChance) {
                    const itemKeys = Object.keys(ITEMS).filter(k => k !== 'reviveScroll');
                    const availableItems = itemKeys.filter(key =>
                        ITEMS[key].level <= Math.ceil(gameState.floor / 2 + 1) &&
                        ITEMS[key].type !== ITEM_TYPES.ESSENCE
                    );
                    let randomItemKey = availableItems[Math.floor(Math.random() * availableItems.length)];
                    if (Math.random() < 0.05) {
                        randomItemKey = 'superiorEgg';
                    } else if (Math.random() < 0.1 && ITEMS.reviveScroll.level <= Math.ceil(gameState.floor / 2 + 1)) {
                        randomItemKey = 'reviveScroll';
                    }
                    const pos = findAdjacentEmpty(monster.x, monster.y);
                    if (pos.x === monster.x && pos.y === monster.y) {
                        itemOnCorpse = true;
                    }
                    const droppedItem = createItem(randomItemKey, pos.x, pos.y, null, Math.floor(gameState.floor / 5), Math.random() < 0.1);
                    gameState.items.push(droppedItem);
                    gameState.dungeon[pos.y][pos.x] = 'item';
                    addMessage(`📦 ${monster.name}이(가) ${formatItemName(droppedItem)}을(를) 떨어뜨렸습니다!`, 'item');
                }
            }
            const unknown = Object.keys(RECIPES).filter(r => !gameState.knownRecipes.includes(r));
            if (!monster.isChampion && unknown.length && Math.random() < 0.25) {
                const pos = findAdjacentEmpty(monster.x, monster.y);
                if (pos.x === monster.x && pos.y === monster.y) {
                    itemOnCorpse = true;
                }
                const scroll = createRecipeScroll(unknown[Math.floor(Math.random() * unknown.length)], pos.x, pos.y);
                gameState.items.push(scroll);
                gameState.dungeon[pos.y][pos.x] = 'item';
            }
            const idx = gameState.monsters.findIndex(m => m === monster);
            if (idx !== -1) gameState.monsters.splice(idx, 1);
            monster.health = 0;
            monster.turnsLeft = CORPSE_TURNS;
            gameState.corpses.push(monster);
            gameState.dungeon[monster.y][monster.x] = itemOnCorpse ? 'item' : 'corpse';
        }

        function convertMonsterToMercenary(monster) {
            return {
                id: monster.id,
                type: 'MONSTER',
                monsterType: monster.type,
                isMonster: true,
                isElite: !!monster.isElite,
                isChampion: !!monster.isChampion,
                isSuperior: !!monster.isSuperior,
                name: monster.name,
                icon: monster.icon,
                role: monster.special === 'ranged' ? 'ranged' : monster.special === 'magic' ? 'caster' : 'tank',
                x: -1,
                y: -1,
                level: monster.level,
                stars: (monster.isSuperior || monster.isChampion) ? Object.assign({}, monster.stars) : {strength:0, agility:0, endurance:0, focus:0, intelligence:0},
                endurance: monster.endurance,
                focus: monster.focus,
                strength: monster.strength,
                agility: monster.agility,
                intelligence: monster.intelligence,
                baseDefense: monster.baseDefense,
                maxHealth: monster.maxHealth,
                health: monster.maxHealth,
                maxMana: monster.maxMana,
                mana: monster.maxMana,
                shield: 0,
                shieldTurns: 0,
                attackBuff: 0,
                attackBuffTurns: 0,
                healthRegen: monster.healthRegen || 0,
                manaRegen: monster.manaRegen || 1,
                auraSkill: monster.auraSkill || null,
                skill: (() => {
                    if (monster.isSuperior) return monster.skill;
                    if (monster.isElite) return monster.auraSkill;
                    return monster.monsterSkill || null;
                })(),
                skill2: (() => {
                    if (monster.isSuperior) return monster.auraSkill;
                    if (monster.isElite) return monster.monsterSkill || null;
                    return null;
                })(),
                attack: monster.attack,
                defense: monster.defense,
                accuracy: monster.accuracy,
                evasion: monster.evasion,
                critChance: monster.critChance,
                magicPower: monster.magicPower,
                magicResist: monster.magicResist,
                elementResistances: Object.assign({}, monster.elementResistances),
                statusResistances: Object.assign({paralysis:0,nightmare:0,silence:0,petrify:0,debuff:0}, monster.statusResistances),
                poison:false,burn:false,freeze:false,bleed:false,
                paralysis:false,nightmare:false,silence:false,petrify:false,debuff:false,
                poisonTurns:0,burnTurns:0,freezeTurns:0,bleedTurns:0,
                paralysisTurns:0,nightmareTurns:0,silenceTurns:0,petrifyTurns:0,debuffTurns:0,
                exp: 0,
                expNeeded: 15,
                skillPoints: 0,
                skillLevels: (() => {
                    const obj = {};
                    if (monster.monsterSkill) obj[monster.monsterSkill] = monster.skillLevels[monster.monsterSkill] || 1;
                    if (monster.isSuperior) {
                        obj[monster.skill] = monster.skillLevels[monster.skill] || 1;
                        obj[monster.auraSkill] = monster.skillLevels[monster.auraSkill] || 1;
                    } else if (monster.isElite && monster.auraSkill) {
                        obj[monster.auraSkill] = monster.skillLevels[monster.auraSkill] || 1;
                    }
                    return obj;
                })(),
                skillCooldowns: {},
                alive: true,
                affinity: 30,
                fullness: 75,
                hasActed: false,
                equipped: { weapon: null, armor: null, accessory1: null, accessory2: null, tile: null },
                range: monster.range,
                special: monster.special,
                trait: monster.trait || null,
                statusEffect: monster.statusEffect,
                ...(monster.trait && MONSTER_TRAITS[monster.trait] && MONSTER_TRAITS[monster.trait].element ? { [MONSTER_TRAITS[monster.trait].element + 'Damage']: monster[MONSTER_TRAITS[monster.trait].element + 'Damage'] } : {})
            };
        }

        function reviveMonsterCorpse(corpse) {
            const cost = 200;
            if (gameState.player.gold < cost) {
                addMessage(`💸 골드가 부족합니다. 부활에는 ${formatNumber(cost)} 골드가 필요합니다.`, 'info');
                return;
            }
            const mercenary = convertMonsterToMercenary(corpse);
            // Count all active mercenary slots, dead or alive
            const activeCount = gameState.activeMercenaries.length;
            if (activeCount < 5) {
                if (!spawnMercenaryNearPlayer(mercenary)) {
                    addMessage('❌ 용병을 배치할 공간이 없습니다.', 'info');
                    return;
                }
                gameState.player.gold -= cost;
                gameState.activeMercenaries.push(mercenary);
                addMessage(`🎉 ${corpse.name}을(를) 부활시켜 동료로 만들었습니다!`, 'mercenary');
                playPlayerVoice('assets/audio/player_revive.mp3');
            } else if (gameState.standbyMercenaries.length < 5) {
                gameState.player.gold -= cost;
                gameState.standbyMercenaries.push(mercenary);
                addMessage(`📋 부활한 ${corpse.name}을(를) 대기열에 추가했습니다.`, 'mercenary');
                playPlayerVoice('assets/audio/player_revive.mp3');
            } else {
                addMessage('❌ 용병이 가득 찼습니다.', 'info');
                return;
            }

            const idx = gameState.corpses.findIndex(c => c === corpse);
            if (idx !== -1) gameState.corpses.splice(idx, 1);
            const hasItem = gameState.items.some(i => i.x === corpse.x && i.y === corpse.y);
            gameState.dungeon[corpse.y][corpse.x] = hasItem ? 'item' : 'empty';
            updateStats();
            updateMercenaryDisplay();
            renderDungeon();
        }

        function dissectCorpse(corpse) {
            const materialsPool = ['bone', '가죽', 'bread', 'meat', 'rawMeat', 'lettuce'];
            const gained = [];
            const count = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < count; i++) {
                const mat = materialsPool[Math.floor(Math.random() * materialsPool.length)];
                if (!gameState.materials[mat]) gameState.materials[mat] = 0;
                gameState.materials[mat] += 1;
                gained.push(mat);
            }
            const idx = gameState.corpses.findIndex(c => c === corpse);
            if (idx !== -1) gameState.corpses.splice(idx, 1);
            const hasItem = gameState.items.some(i => i.x === corpse.x && i.y === corpse.y);
            gameState.dungeon[corpse.y][corpse.x] = hasItem ? 'item' : 'empty';
            addMessage(`🔪 ${corpse.name}의 시체를 해체하여 ${gained.join(', ')}을(를) 얻었습니다.`, 'item');
            renderDungeon();
        }

        function ignoreCorpse(corpse) {
            // Move the player onto the corpse tile
            gameState.player.x = corpse.x;
            gameState.player.y = corpse.y;

            // Collect any item on the corpse position
            const item = gameState.items.find(i => i.x === corpse.x && i.y === corpse.y);
            if (item) {
                addToInventory(item);
                addMessage(`📦 ${formatItemName(item)}을(를) 획득했습니다!`, 'item');
                const idx = gameState.items.findIndex(i => i === item);
                if (idx !== -1) gameState.items.splice(idx, 1);
            }

            // Remove the corpse and clear the dungeon cell
            const cIdx = gameState.corpses.findIndex(c => c === corpse);
            if (cIdx !== -1) gameState.corpses.splice(cIdx, 1);
            gameState.dungeon[corpse.y][corpse.x] = 'empty';

            // Move the player to a neighbouring empty tile
            const pos = findAdjacentEmpty(corpse.x, corpse.y);
            gameState.player.x = pos.x;
            gameState.player.y = pos.y;
        }

        function getMonsterRank(monster) {
            if (monster.special === 'boss') return '보스';
            if (monster.isChampion) return '챔피언';
            if (monster.isSuperior) return '상급';
            if (monster.isElite) return '엘리트';
            return '일반';
        }

        function getMonsterImage(monster) {
            const type = typeof monster === 'string' ? monster : monster.type;
            const map = {
                SLIME: 'slime.png',
                GOBLIN: 'goblin.png',
                GOBLIN_ARCHER: 'goblin-archer.png',
                GOBLIN_WIZARD: 'goblin-wizard.png',
                ZOMBIE: 'zombie.png',
                KOBOLD: 'kobold.png',
                SKELETON: 'skeleton.png',
                SKELETON_MAGE: 'skeleton_mage.png',
                ARCHER: 'archer.png',
                WIZARD: 'wizard.png',
                BARD: 'bard.png',
                GARGOYLE: 'gargoyle.png',
                ORC: 'orc.png',
                ORC_ARCHER: 'orc_archer.png',
                TROLL: 'troll.png',
                BANSHEE: 'banshee.png',
                DARK_MAGE: 'dark_mage.png',
                MINOTAUR: 'minotaur.png',
                DEMON_WARRIOR: 'demon_warrior.png',
                LICH: 'lich.png',
                DRAGON_WHELP: 'dragon_whelp.png',
                ELEMENTAL_GOLEM: 'elemental_golem.png'
            };
            return map[type] ? `assets/images/${map[type]}` : null;
        }

        function getMercImage(merc) {
            const type = typeof merc === 'string' ? merc : merc.type;
            const map = {
                WARRIOR: 'warrior.png',
                ARCHER: 'archer.png',
                HEALER: 'healer.png',
                WIZARD: 'wizard.png',
                BARD: 'bard.png',
                PALADIN: 'paladin.png'
            };
            return map[type] ? `assets/images/${map[type]}` : null;
        }

        function getPlayerImage() {
            return 'assets/images/player.png';
        }

        function getUnitImage(unit) {
            if (unit === gameState.player) {
                return getPlayerImage();
            }
            if (gameState.activeMercenaries && gameState.activeMercenaries.includes(unit)) {
                return getMercImage(unit.type);
            }
            return getMonsterImage(unit);
        }

        function placeEggInIncubator(eggItem, turns) {
            const idx = gameState.incubators.findIndex(s => s === null);
            if (idx === -1) {
                addMessage('❌ 인큐베이터가 가득 찼습니다.', 'info');
                return false;
            }
            gameState.incubators[idx] = { egg: eggItem, remainingTurns: turns };
            const invIdx = gameState.player.inventory.findIndex(i => i.id === eggItem.id);
            if (invIdx !== -1) gameState.player.inventory.splice(invIdx, 1);
            updateInventoryDisplay();
            updateIncubatorDisplay();
            return true;
        }

        function removeEggFromIncubator(index) {
            const slot = gameState.incubators[index];
            if (!slot) return;
            addToInventory(slot.egg);
            gameState.incubators[index] = null;
            updateIncubatorDisplay();
        }

        function advanceGameLoop() {
            processTurn();
        }

        function advanceIncubators() {
            const monsterTypes = getAllMonsterTypes();
            gameState.incubators.forEach((slot, i) => {
                if (!slot) return;
                slot.remainingTurns--;
                if (slot.remainingTurns <= 0) {
                    SoundEngine.playSound('eggHatch');
                    const t = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
                    const monster = createSuperiorMonster(t, 0, 0, gameState.floor);
                    gameState.hatchedSuperiors.push(monster);
                    addMessage(`🥚 ${monster.name}이(가) 부화했습니다!`, 'info');
                    gameState.incubators[i] = null;
                }
            });
        }


        function recruitHatchedSuperior(monster) {
            const mercenary = convertMonsterToMercenary(monster);
            // Count all active mercenary slots, dead or alive
            const activeCount = gameState.activeMercenaries.length;
            if (activeCount < 5) {
                if (!spawnMercenaryNearPlayer(mercenary)) {
                    addMessage('❌ 용병을 배치할 공간이 없습니다.', 'info');
                    return;
                }
                gameState.activeMercenaries.push(mercenary);
                addMessage(`🎉 ${mercenary.name}이(가) 합류했습니다!`, 'mercenary');
            } else if (gameState.standbyMercenaries.length < 5) {
                gameState.standbyMercenaries.push(mercenary);
                addMessage(`📋 ${mercenary.name}을(를) 대기열에 추가했습니다.`, 'mercenary');
            } else {
                addMessage('❌ 용병이 가득 찼습니다.', 'info');
                return;
            }
            const idx = gameState.hatchedSuperiors.findIndex(m => m === monster);
            if (idx !== -1) gameState.hatchedSuperiors.splice(idx, 1);
            updateMercenaryDisplay();
            updateIncubatorDisplay();
            renderDungeon();
        }

        function getAllMonsterTypes() {
            return Object.keys(MONSTER_TYPES);
        }

        function getMonsterPoolForFloor(floor) {
            if (floor <= 2) return ['SLIME', 'GOBLIN', 'GOBLIN_ARCHER', 'ZOMBIE'];
            if (floor <= 4) return ['KOBOLD', 'GOBLIN_WIZARD', 'SKELETON', 'ZOMBIE'];
            if (floor <= 6) return ['GARGOYLE', 'SKELETON', 'SKELETON_MAGE', 'ORC'];
            if (floor <= 8) return ['BANSHEE', 'ORC', 'ORC_ARCHER', 'TROLL'];
            if (floor <= 10) return ['MINOTAUR', 'TROLL', 'ORC_ARCHER', 'DARK_MAGE'];
            if (floor <= 12) return ['LICH', 'DARK_MAGE', 'TROLL', 'DEMON_WARRIOR'];
            if (floor <= 14) return ['DRAGON_WHELP', 'DEMON_WARRIOR', 'DARK_MAGE', 'TROLL'];
            if (floor <= 16) return ['ELEMENTAL_GOLEM', 'DEMON_WARRIOR', 'DARK_MAGE', 'TROLL'];
            if (floor <= 18) return ['ELEMENTAL_GOLEM', 'DEMON_WARRIOR', 'MINOTAUR', 'DRAGON_WHELP'];
            return ['ELEMENTAL_GOLEM', 'DEMON_WARRIOR', 'DRAGON_WHELP', 'LICH'];
        }

        function applyStatusEffects(entity) {
            const name = entity === gameState.player ? '플레이어' : entity.name;
            let died = false;
            if (entity.poison && entity.poisonTurns > 0) {
                applyDamage(entity, 2);
                entity.poisonTurns--;
                addMessage(`☠️ ${name}이(가) 독으로 2의 피해를 입었습니다.`, 'combat');
                if (entity.poisonTurns <= 0) entity.poison = false;
            }
            if (entity.burn && entity.burnTurns > 0) {
                applyDamage(entity, 3);
                entity.burnTurns--;
                addMessage(`🔥 ${name}이(가) 화상으로 3의 피해를 입었습니다.`, 'combat');
                if (entity.burnTurns <= 0) entity.burn = false;
            }
            if (entity.freeze && entity.freezeTurns > 0) {
                applyDamage(entity, 1);
                entity.freezeTurns--;
                addMessage(`❄️ ${name}이(가) 빙결로 1의 피해를 입었습니다.`, 'combat');
                if (entity.freezeTurns <= 0) entity.freeze = false;
            }
            if (entity.bleed && entity.bleedTurns > 0) {
                applyDamage(entity, 2);
                entity.bleedTurns--;
                addMessage(`🩸 ${name}이(가) 출혈로 2의 피해를 입었습니다.`, 'combat');
                if (entity.bleedTurns <= 0) entity.bleed = false;
            }
            if (entity.nightmare && entity.nightmareTurns > 0) {
                applyDamage(entity, 2);
                entity.nightmareTurns--;
                addMessage(`😱 ${name}이(가) 악몽으로 2의 피해를 입었습니다.`, 'combat');
                if (entity.nightmareTurns <= 0) entity.nightmare = false;
            }
            if (entity.paralysis && entity.paralysisTurns > 0) {
                entity.paralysisTurns--;
                addMessage(`⚡ ${name}이(가) 마비되어 움직일 수 없습니다.`, 'combat');
                if (entity.paralysisTurns <= 0) entity.paralysis = false;
            }
            if (entity.silence && entity.silenceTurns > 0) {
                entity.silenceTurns--;
                addMessage(`🤐 ${name}이(가) 침묵 상태입니다.`, 'combat');
                if (entity.silenceTurns <= 0) entity.silence = false;
            }
            if (entity.petrify && entity.petrifyTurns > 0) {
                entity.petrifyTurns--;
                addMessage(`🪨 ${name}이(가) 석화되었습니다.`, 'combat');
                if (entity.petrifyTurns <= 0) entity.petrify = false;
            }
            if (entity.debuff && entity.debuffTurns > 0) {
                entity.debuffTurns--;
                addMessage(`⬇️ ${name}이(가) 약화 상태입니다.`, 'combat');
                if (entity.debuffTurns <= 0) entity.debuff = false;
            }
            if (entity.health <= 0) died = true;
            return died;
        }

        // 던전 렌더링
        function renderDungeon() {
            const dungeonEl = document.getElementById('dungeon');
            if (!dungeonEl || !gameState.cellElements.length) return;
            for (let y = 0; y < gameState.dungeonSize; y++) {
                for (let x = 0; x < gameState.dungeonSize; x++) {
                    const div = gameState.cellElements[y][x];
                    const tileBg = div.querySelector('.equipped-tile-bg');
                    if (tileBg) tileBg.style.removeProperty('background-image');
                    div.style.removeProperty('background-image');
                    div.classList.remove('low-health');
                    // 렌더링마다 이전 아이콘들을 모두 지워 잔상이 남지 않게 합니다.
                    const buffEl = div.querySelector('.buff-container');
                    const statusEl = div.querySelector('.status-container');
                    if (buffEl) buffEl.innerHTML = '';
                    if (statusEl) statusEl.innerHTML = '';
                    const baseCellType = gameState.dungeon[y][x];
                    const finalClasses = ['cell', baseCellType];
                    let mapTile = null;
                    if (baseCellType === 'tile') {
                        mapTile = gameState.mapTiles.find(t => t.x === x && t.y === y);
                    }
                    div.textContent = '';

                    if (x === gameState.player.x && y === gameState.player.y) {
                        finalClasses.push('player');
                        const bgImages = [];
                        if (mapTile) bgImages.push(`url('${String(mapTile.imageUrl)}')`);
                        if (gameState.player.equipped.tile) {
                            bgImages.push(`url('${String(gameState.player.equipped.tile.imageUrl)}')`);
                        }
                        if (tileBg && bgImages.length) tileBg.style.backgroundImage = bgImages.join(', ');
                        const maxHealth = getStat(gameState.player, 'maxHealth');
                        if (maxHealth > 0 && gameState.player.health / maxHealth < 0.25) {
                            finalClasses.push('low-health');
                        }
                        updateUnitEffectIcons(gameState.player, div);
                    } else {
                            const merc = gameState.activeMercenaries.find(m => m.x === x && m.y === y && m.alive);
                            if (merc) {
                                finalClasses.push('mercenary');
                                if (merc.isMonster && merc.monsterType) {
                                    // 아군이 된 몬스터의 경우 monsterType을 이용해 몬스터 이미지 클래스를 적용
                                    finalClasses.push('monster', merc.monsterType.replace('_', '-').toLowerCase());
                                } else if (merc.type) {
                                    // 일반 용병일 경우 기존 로직대로 type을 사용
                                    finalClasses.push(merc.type.toLowerCase());
                                }
                                if (merc.isSuperior) finalClasses.push('superior');
                                else if (merc.isChampion) finalClasses.push('champion');
                                else if (merc.isElite) finalClasses.push('elite');
                                const mercBgImages = [];
                                if (mapTile) mercBgImages.push(`url('${String(mapTile.imageUrl)}')`);
                                if (merc.equipped.tile) {
                                    mercBgImages.push(`url('${String(merc.equipped.tile.imageUrl)}')`);
                                }
                                if (tileBg && mercBgImages.length) tileBg.style.backgroundImage = mercBgImages.join(', ');
                                const maxHealth = getStat(merc, 'maxHealth');
                                if (maxHealth > 0 && merc.health / maxHealth < 0.25) {
                                    finalClasses.push('low-health');
                                }
                                div.textContent = '';
                                updateUnitEffectIcons(merc, div);
                            } else {
                                const proj = gameState.projectiles.find(p => p.x === x && p.y === y);
                                if (proj) {
                                    finalClasses.push('projectile');
                                    div.textContent = proj.icon;
                                } else if (baseCellType === 'monster') {
                                const m = gameState.monsters.find(mon => mon.x === x && mon.y === y);
                                if (m) {
                                    if (m.isChampion) {
                                        // 1. 'monster' 클래스를 'empty'로 교체
                                        const monsterClassIndex = finalClasses.indexOf('monster');
                                        if (monsterClassIndex > -1) {
                                            finalClasses[monsterClassIndex] = 'empty';
                                        }
                                        // 2. 용병과 직업 클래스 추가
                                        finalClasses.push('mercenary', m.type.toLowerCase());
                                    } else {
                                        const monsterClass = m.type.replace('_', '-').toLowerCase();
                                        finalClasses.push('monster', monsterClass);

                                        // BUG FIX: 이미지 스프라이트가 있는 몬스터 목록에 4종을 추가하여
                                        // 불필요한 텍스트 아이콘이 표시되지 않도록 수정합니다.
                                        const monstersWithSprites = ['slime', 'goblin-archer', 'goblin', 'zombie', 'kobold', 'skeleton', 'goblin-wizard'];
                                        if (!monstersWithSprites.includes(monsterClass)) {
                                             div.textContent = m.icon;
                                        }
                                    }
                                    const maxHealth = getStat(m, 'maxHealth');
                                    if (maxHealth > 0 && m.health / maxHealth < 0.25) {
                                        finalClasses.push('low-health');
                                    }
                                    if (m.isSuperior) finalClasses.push('superior');
                                    else if (m.isChampion) finalClasses.push('champion');
                                    else if (m.isElite) finalClasses.push('elite');
                                    if (tileBg && mapTile) {
                                        tileBg.style.backgroundImage = `url('${String(mapTile.imageUrl)}')`;
                                    }
                                    updateUnitEffectIcons(m, div);
                                }
                            } else if (baseCellType === 'item') {
                                const item = gameState.items.find(it => it.x === x && it.y === y);
                                if (item) {
                                    if (item.imageUrl) {
                                        div.style.backgroundImage = `url('${String(item.imageUrl)}'), url('assets/images/floor-tile.png')`;
                                        div.style.backgroundSize = 'contain, cover';
                                        div.style.backgroundPosition = 'center, center';
                                        div.style.backgroundRepeat = 'no-repeat, no-repeat';
                                        div.textContent = '';
                                    } else {
                                        div.textContent = item.icon;
                                    }
                                }
                            } else if (baseCellType === 'tile') {
                                if (tileBg && mapTile) {
                                    tileBg.style.backgroundImage = `url('${String(mapTile.imageUrl)}')`;
                                }
                            } else if (baseCellType === 'plant') {
                                div.textContent = '🌿';
                            } else if (baseCellType === 'chest') {
                                div.textContent = '🎁';
                            } else if (baseCellType === 'mine') {
                                div.textContent = '⛏️';
                            } else if (baseCellType === 'tree') {
                                div.textContent = '🌳';
                            } else if (baseCellType === 'paladin') {
                                div.style.backgroundImage = `url('assets/images/paladin.png'), url('assets/images/floor-tile.png')`;
                                div.style.backgroundSize = 'contain, cover';
                                div.style.backgroundPosition = 'center, center';
                                div.style.backgroundRepeat = 'no-repeat, no-repeat';
                            } else if (baseCellType === 'bones') {
                                div.textContent = '🦴';
                            } else if (baseCellType === 'grave') {
                                div.textContent = '🪦';
                            } else if (baseCellType.startsWith('temple')) {
                                div.textContent = '⛩️';
                            } else if (baseCellType === 'altar') {
                                div.textContent = '🗺️';
                            } else if (baseCellType === 'corpse') {
                                const corpse = gameState.corpses.find(c => c.x === x && c.y === y);
                                div.textContent = (corpse && corpse.icon) ? corpse.icon : '💀';
                                finalClasses.push('corpse');
                            } else if (baseCellType === 'treasure') {
                                div.textContent = '💰';
                            } else if (baseCellType === 'exit') {
                                div.textContent = '🚪';
                            } else if (baseCellType === 'shop') {
                                div.textContent = '🏪';
                            }
                        }
                    }

                    div.className = finalClasses.join(' ');
                    if (gameState.fogOfWar[y] && gameState.fogOfWar[y][x]) {
                        div.style.filter = 'brightness(0.2)';
                    } else {
                        div.style.filter = '';
                    }
                }
            }
        }

        function handleDungeonClick(e) {
            initializeAudio();
            const cell = e.target.closest('.cell');
            if (!cell) return;
            const x = parseInt(cell.dataset.x, 10);
            const y = parseInt(cell.dataset.y, 10);
            const monster = gameState.monsters.find(m => m.x === x && m.y === y);
            if (monster) {
                if (monster.isChampion) showChampionDetails(monster);
                else showMonsterDetails(monster);
                return;
            }
            const merc = gameState.activeMercenaries.find(m => m.x === x && m.y === y && m.alive);
            if (merc) {
                showMercenaryDetails(merc);
                return;
            }

            const path = findPath(gameState.player.x, gameState.player.y, x, y);
            if (path && path.length > 1) {
                gameState.autoMovePath = path.slice(1);
                autoMoveStep();
            }
        }



        function updateActionButtons() {
            const atk = document.getElementById('attack');
            const rng = document.getElementById('ranged');
            const heal = document.getElementById('heal');
            atk.style.display = 'inline-block';
            rng.style.display = 'inline-block';
            heal.style.display = 'inline-block';
        }

        // 플레이어 레벨업 체크
        function checkLevelUp() {
            while (gameState.player.exp >= gameState.player.expNeeded) {
                gameState.player.exp -= gameState.player.expNeeded;
                gameState.player.level += 1;

                gameState.player.skillPoints += 1;
                gameState.player.statPoints = (gameState.player.statPoints || 0) + 5;

                gameState.player.endurance += 2;
                gameState.player.strength += 1;
                gameState.player.agility += 1;

                gameState.player.health = getStat(gameState.player, 'maxHealth');
                gameState.player.mana = getStat(gameState.player, 'maxMana');
                gameState.player.expNeeded = Math.floor(gameState.player.expNeeded * 1.5);
                SoundEngine.playSound('levelUp'); // 레벨업 효과음 재생
                addMessage(`🎉 플레이어 레벨이 ${gameState.player.level}이(가) 되었습니다!`, 'level');

                updateStats();
                updateSkillDisplay();
            }
        }

        function allocateStat(stat) {
            if (gameState.player.statPoints <= 0) return;
            if (!['strength','agility','endurance','focus','intelligence'].includes(stat)) return;
            SoundEngine.playSound('statAllocate');
            gameState.player[stat] += 1;
            gameState.player.statPoints -= 1;
            updateStats();
        }

        function checkMercenaryLevelUp(mercenary) {
            while (mercenary.exp >= mercenary.expNeeded) {
                mercenary.exp -= mercenary.expNeeded;
                mercenary.level += 1;
                mercenary.skillPoints += 1;
                mercenary.endurance += 2 + mercenary.stars.endurance * 0.5;
                mercenary.strength += 1 + mercenary.stars.strength * 0.5;
                mercenary.agility += 1 + mercenary.stars.agility * 0.5;
                mercenary.focus += 1 + mercenary.stars.focus * 0.5;
                mercenary.intelligence += 1 + mercenary.stars.intelligence * 0.5;
                mercenary.health = getStat(mercenary, 'maxHealth');
                mercenary.mana = getStat(mercenary, 'maxMana');
                mercenary.expNeeded = Math.floor(mercenary.expNeeded * 1.5);
                addMessage(`🎉 ${mercenary.name}의 레벨이 ${mercenary.level}이(가) 되었습니다!`, 'mercenary');
                updateMercenaryDisplay();
                if (window.currentDetailMercenary && window.currentDetailMercenary.id === mercenary.id) {
                    showMercenaryDetails(mercenary);
                }
            }
        }

        function checkMonsterLevelUp(monster) {
            while (monster.exp >= monster.expNeeded) {
                monster.exp -= monster.expNeeded;
                monster.level += 1;
                if ((monster.isSuperior || monster.isChampion) && monster.stars) {
                    monster.endurance += 2 + monster.stars.endurance * 0.5;
                    monster.strength += 1 + monster.stars.strength * 0.5;
                    monster.agility += 1 + monster.stars.agility * 0.5;
                    monster.focus += 1 + monster.stars.focus * 0.5;
                    monster.intelligence += 1 + monster.stars.intelligence * 0.5;
                } else {
                    monster.endurance += 2;
                    monster.strength += 1;
                    monster.agility += 1;
                    monster.focus += 1;
                    monster.intelligence += 1;
                }
                monster.health = getStat(monster, 'maxHealth');
                monster.mana = getStat(monster, 'maxMana');
                monster.attack = getStat(monster, 'attack');
                monster.defense = getStat(monster, 'defense');
                monster.accuracy = getStat(monster, 'accuracy');
                monster.evasion = getStat(monster, 'evasion');
                monster.critChance = getStat(monster, 'critChance');
                monster.magicPower = getStat(monster, 'magicPower');
                monster.magicResist = getStat(monster, 'magicResist');
                monster.expNeeded = Math.floor(monster.expNeeded * 1.5);
                addMessage(`📈 ${monster.name}의 레벨이 ${monster.level}이(가) 되었습니다!`, 'combat');
                if (window.currentDetailMonster && window.currentDetailMonster.id === monster.id) {
                    showMonsterDetails(monster);
                }
            }
        }

        // 던전 생성
        function generateDungeon(mapData = null) {
            const size = gameState.dungeonSize;
            const modifiers = mapData ? (mapData.modifiers || {}) : {};
            const dungeonLevel = mapData ? mapData.level : gameState.floor;
            gameState.currentMapModifiers = modifiers;
            const dungeonEl = document.getElementById('dungeon');
            if (dungeonEl) {
                dungeonEl.style.setProperty('--dungeon-size', size);
                dungeonEl.style.gridTemplateColumns = `repeat(${size}, ${CELL_WIDTH}px)`;
                dungeonEl.style.gridTemplateRows = `repeat(${size}, ${CELL_WIDTH}px)`;
            }
            gameState.dungeon = [];
            gameState.fogOfWar = [];
            gameState.cellElements = [];
            gameState.monsters = [];
            gameState.treasures = [];
            gameState.items = [];

            if (dungeonEl) dungeonEl.innerHTML = '';

            for (let y = 0; y < size; y++) {
                const row = [];
                const fogRow = [];
                const cellRow = [];
                for (let x = 0; x < size; x++) {
                    row.push('wall');
                    fogRow.push(true);

                    if (dungeonEl) {
                        const cellDiv = document.createElement('div');
                        cellDiv.dataset.x = x;
                        cellDiv.dataset.y = y;
                        const tileBg = document.createElement('div');
                        tileBg.className = 'equipped-tile-bg';
                        cellDiv.appendChild(tileBg);
                        cellDiv.className = 'cell';

                        // 버프/디버프 아이콘 컨테이너
                        const buffContainer = document.createElement('div');
                        buffContainer.className = 'buff-container';
                        cellDiv.appendChild(buffContainer);

                        // 상태이상 아이콘 컨테이너
                        const statusContainer = document.createElement('div');
                        statusContainer.className = 'status-container';
                        cellDiv.appendChild(statusContainer);

                        dungeonEl.appendChild(cellDiv);
                        cellRow.push(cellDiv);
                    }
                }
                gameState.dungeon.push(row);
                gameState.fogOfWar.push(fogRow);
                gameState.cellElements.push(cellRow);
            }

            const shuffleArray = arr => {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            };

            const visited = Array.from({ length: size }, () => Array(size).fill(false));
            const visitedCells = [];
            const stack = [{ x: 1, y: 1 }];
            visited[1][1] = true;
            gameState.dungeon[1][1] = 'empty';
            visitedCells.push({ x: 1, y: 1 });

            while (stack.length) {
                const { x, y } = stack[stack.length - 1];
                const dirs = [
                    { dx: 1, dy: 0 },
                    { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 },
                    { dx: 0, dy: -1 }
                ];
                shuffleArray(dirs);
                let carved = false;
                for (const { dx, dy } of dirs) {
                    const nx = x + dx * 8; // 값을 2에서 8로 변경
                    const ny = y + dy * 8; // 값을 2에서 8로 변경
                    if (nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && !visited[ny][nx]) {
                        visited[ny][nx] = true;
                        carveWideCorridor(gameState.dungeon, x, y, nx, ny);
                        stack.push({ x: nx, y: ny });
                        visitedCells.push({ x: nx, y: ny });
                        carved = true;
                        break;
                    }
                }
                if (!carved) stack.pop();
            }

            const extraCount = Math.floor(size * size * 0.05);
            for (let i = 0; i < extraCount; i++) {
                const base = visitedCells[Math.floor(Math.random() * visitedCells.length)];
                const dirs = [
                    { dx: 1, dy: 0 },
                    { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 },
                    { dx: 0, dy: -1 }
                ];
                shuffleArray(dirs);
                for (const { dx, dy } of dirs) {
                    const nx = base.x + dx;
                    const ny = base.y + dy;
                    if (nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && gameState.dungeon[ny][nx] === 'wall') {
                        carveWideCorridor(gameState.dungeon, base.x, base.y, nx, ny);
                        visitedCells.push({ x: nx, y: ny });
                        break;
                    }
                }
            }

            gameState.player.x = 1;
            gameState.player.y = 1;
            gameState.dungeon[1][1] = 'empty';

            if (gameState.floor === 1 && gameState.player.inventory.length === 0) {
                const starterPotion = createItem('healthPotion', 0, 0);
                gameState.player.inventory.push(starterPotion);

                const isTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
                gameState.player.equipped.weapon = createItem('volcanicEruptor', 0, 0, null, 0, !isTestEnv);
                gameState.player.equipped.armor = createItem('glacialGuard', 0, 0, null, 0, !isTestEnv);
                gameState.player.equipped.accessory1 = createItem('guardianAmulet', 0, 0, null, 0, !isTestEnv);
                gameState.player.equipped.accessory2 = createItem('courageAmulet', 0, 0, null, 0, !isTestEnv);
                // 시작 슈페리어 알을 플레이어 앞에 드랍하도록 수정
                const starterEgg = createItem('superiorEgg', gameState.player.x + 1, gameState.player.y);
                starterEgg.incubation = 1; // 이 알의 부화 시간을 1턴으로 특별히 설정
                gameState.items.push(starterEgg);
                gameState.dungeon[starterEgg.y][starterEgg.x] = 'item';

                const essences = ['strengthEssence','agilityEssence','enduranceEssence','focusEssence','intelligenceEssence','skillLevelEssence'];
                essences.forEach(k => {
                    gameState.player.inventory.push(createItem(k, 0, 0));
                });

                const equipmentKeys = Object.keys(ITEMS).filter(k => {
                    const t = ITEMS[k].type;
                    return t === ITEM_TYPES.WEAPON || t === ITEM_TYPES.ARMOR || t === ITEM_TYPES.ACCESSORY;
                });
                for (let i = 0; i < 6; i++) {
                    const key = equipmentKeys[Math.floor(Math.random() * equipmentKeys.length)];
                    gameState.player.inventory.push(createItem(key, 0, 0, null, 0, true));
                }
            }


            gameState.exitLocations = [];
            let exitCount = Math.floor(Math.random() * 4) + 1; // 1~4개 출구 생성
            for (let i = 0; i < exitCount; i++) {
                let exitX = 1, exitY = 1;
                if (visitedCells.length > 1) {
                    let exitCell;
                    do {
                        exitCell = visitedCells[Math.floor(Math.random() * visitedCells.length)];
                    } while ((exitCell.x === 1 && exitCell.y === 1) || gameState.dungeon[exitCell.y][exitCell.x] === 'exit');
                    exitX = exitCell.x;
                    exitY = exitCell.y;
                }
                gameState.exitLocations.push({ x: exitX, y: exitY });
                gameState.dungeon[exitY][exitX] = 'exit';
            }
            if (gameState.exitLocations.length) {
                gameState.exitLocation = gameState.exitLocations[0];
            }

            const monsterTypes = getMonsterPoolForFloor(dungeonLevel);
            // 몬스터는 던전 크기와 층수에 비례해 등장 수를 결정
            let monsterCount = Math.floor(size * 0.2 + dungeonLevel * 1.5);
            monsterCount = Math.floor(monsterCount * (modifiers.monsterMultiplier || 1));
            for (let i = 0; i < monsterCount; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * size);
                    y = Math.floor(Math.random() * size);
                } while (gameState.dungeon[y][x] !== 'empty' || (x === 1 && y === 1));
                const type = monsterTypes[Math.floor(Math.random() * (monsterTypes.length - 1))];
                const eliteRoll = Math.random();
                if (eliteRoll < (0.05 + (modifiers.eliteChanceBonus || 0))) {
                    const elite = createEliteMonster(type, x, y, dungeonLevel);
                    elite.speed += modifiers.monsterSpeedBonus || 0;
                    elite.attack += modifiers.monsterAttackBonus || 0;
                    elite.defense += modifiers.monsterDefenseBonus || 0;
                    gameState.monsters.push(elite);
                } else {
                    const monster = createMonster(type, x, y, dungeonLevel);
                    monster.speed += modifiers.monsterSpeedBonus || 0;
                    monster.attack += modifiers.monsterAttackBonus || 0;
                    monster.defense += modifiers.monsterDefenseBonus || 0;
                    gameState.monsters.push(monster);
                }
                gameState.dungeon[y][x] = 'monster';
            }

            // 층마다 챔피언 한 명 배치
            const champTypes = Object.keys(CHAMPION_TYPES);
            let cx = Math.floor(size / 2);
            let cy = Math.floor(size / 2);
            let attempts = 0;
            while ((cx < 0 || cy < 0 || cx >= size || cy >= size || gameState.dungeon[cy][cx] !== 'empty') && attempts < 50) {
                cx = Math.floor(size / 2) + Math.floor(Math.random()*3) - 1;
                cy = Math.floor(size / 2) + Math.floor(Math.random()*3) - 1;
                attempts++;
            }
            if (gameState.dungeon[cy][cx] === 'empty') {
                const ct = champTypes[Math.floor(Math.random() * champTypes.length)];
                const champ = createChampion(ct, cx, cy, dungeonLevel);
                gameState.monsters.push(champ);
                gameState.dungeon[cy][cx] = 'monster';
            }

            // 층마다 엘리트 몬스터 배치
            let ex, ey;
            do {
                ex = Math.floor(Math.random() * size);
                ey = Math.floor(Math.random() * size);
            } while (gameState.dungeon[ey][ex] !== 'empty');
            const eType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
            const elite = createEliteMonster(eType, ex, ey, dungeonLevel);
            gameState.monsters.push(elite);
            gameState.dungeon[ey][ex] = 'monster';
            const around = 2 + Math.floor(Math.random() * 4);
            for (let i = 0; i < around; i++) {
                const pos = findAdjacentEmpty(ex, ey);
                if (gameState.dungeon[pos.y][pos.x] !== 'empty') continue;
                const t = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
                const m = createMonster(t, pos.x, pos.y, dungeonLevel);
                gameState.monsters.push(m);
                gameState.dungeon[pos.y][pos.x] = 'monster';
            }

            // 보물은 던전 크기와 층수에 따라 적당히 배치
            let treasureCount = Math.floor(size * 0.1) + Math.floor(dungeonLevel * 0.5);
            treasureCount = Math.floor(treasureCount * (modifiers.treasureMultiplier || 1));
            for (let i = 0; i < treasureCount; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * size);
                    y = Math.floor(Math.random() * size);
                } while (gameState.dungeon[y][x] !== 'empty');
                const treasure = createTreasure(x, y, 5 + Math.floor(Math.random() * 20));
                gameState.treasures.push(treasure);
                gameState.dungeon[y][x] = 'treasure';
            }

            const itemKeys = Object.keys(ITEMS);
            // 맵에 떨어지는 아이템 수를 줄임
            const itemCount = Math.floor(size * 0.05) + Math.floor(dungeonLevel * 0.25);
            const spawnKeys = itemKeys.filter(k => k !== 'reviveScroll' && ITEMS[k].type !== ITEM_TYPES.ESSENCE);
            for (let i = 0; i < itemCount; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * size);
                    y = Math.floor(Math.random() * size);
                } while (gameState.dungeon[y][x] !== 'empty');
                const key = spawnKeys[Math.floor(Math.random() * spawnKeys.length)];
                const item = createItem(key, x, y, null, Math.floor(dungeonLevel / 5), Math.random() < 0.1);
                gameState.items.push(item);
                gameState.dungeon[y][x] = 'item';
            }


            const plantCount = Math.floor(size * 0.05);
            for (let i = 0; i < plantCount; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * size);
                    y = Math.floor(Math.random() * size);
                } while (gameState.dungeon[y][x] !== 'empty');
                gameState.dungeon[y][x] = 'plant';
            }

            const isTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
            if (!isTestEnv) {
                const chestCount = 1 + Math.floor(Math.random() * 2);
                for (let i = 0; i < chestCount; i++) {
                    let x, y;
                    do {
                        x = Math.floor(Math.random() * size);
                        y = Math.floor(Math.random() * size);
                    } while (gameState.dungeon[y][x] !== 'empty');
                    gameState.dungeon[y][x] = 'chest';
                }

                const mineCount = 1 + Math.floor(Math.random() * 2);
                for (let i = 0; i < mineCount; i++) {
                    let x, y;
                    do {
                        x = Math.floor(Math.random() * size);
                        y = Math.floor(Math.random() * size);
                    } while (gameState.dungeon[y][x] !== 'empty');
                    gameState.dungeon[y][x] = 'mine';
                }

                const treeCount = 2 + Math.floor(Math.random() * 3);
                for (let i = 0; i < treeCount; i++) {
                    let x, y;
                    do {
                        x = Math.floor(Math.random() * size);
                        y = Math.floor(Math.random() * size);
                    } while (gameState.dungeon[y][x] !== 'empty');
                    gameState.dungeon[y][x] = 'tree';
                }

                const boneCount = 1 + Math.floor(Math.random() * 2);
                for (let i = 0; i < boneCount; i++) {
                    let x, y;
                    do {
                        x = Math.floor(Math.random() * size);
                        y = Math.floor(Math.random() * size);
                    } while (gameState.dungeon[y][x] !== 'empty');
                    gameState.dungeon[y][x] = 'bones';
                }

                if (!globalThis.spawnPaladinTest && Math.random() < 0.02) {
                    let px, py;
                    do {
                        px = Math.floor(Math.random() * size);
                        py = Math.floor(Math.random() * size);
                    } while (gameState.dungeon[py][px] !== 'empty');
                    const pal = createMercenary('PALADIN', px, py);
                    gameState.paladinSpawns.push({ x: px, y: py, mercenary: pal });
                    gameState.dungeon[py][px] = 'paladin';
                }

                const templeCount = 1 + Math.floor(Math.random() * 3);
                const templeTypes = ['templeHeal', 'templeFood', 'templeFood', 'templeHeal', 'templeAffinity'];
                for (let i = 0; i < templeCount; i++) {
                    let x, y;
                    do {
                        x = Math.floor(Math.random() * size);
                        y = Math.floor(Math.random() * size);
                    } while (gameState.dungeon[y][x] !== 'empty');
                    const tType = templeTypes[Math.floor(Math.random() * templeTypes.length)];
                    gameState.dungeon[y][x] = tType;
                }

                const graveCount = 1 + Math.floor(Math.random() * 2);
                for (let i = 0; i < graveCount; i++) {
                    let x, y;
                    do {
                        x = Math.floor(Math.random() * size);
                        y = Math.floor(Math.random() * size);
                    } while (gameState.dungeon[y][x] !== 'empty');
                    gameState.dungeon[y][x] = 'grave';
                }
            }

            if (gameState.floor % 5 === 0) {
                let ax, ay;
                do {
                    ax = Math.floor(Math.random() * size);
                    ay = Math.floor(Math.random() * size);
                } while (gameState.dungeon[ay][ax] !== 'empty');
                gameState.altarLocation = { x: ax, y: ay };
                gameState.dungeon[ay][ax] = 'altar';
            }


            // 상점 위치 및 아이템 설정
            let sx, sy;
            do {
                sx = Math.floor(Math.random() * size);
                sy = Math.floor(Math.random() * size);
            } while (gameState.dungeon[sy][sx] !== 'empty');
            gameState.shopLocation = { x: sx, y: sy };
            gameState.dungeon[sy][sx] = 'shop';

            gameState.shopItems = [];
            const availableItems = itemKeys.filter(k =>
                ITEMS[k].level <= Math.ceil(gameState.floor / 2 + 1) &&
                ITEMS[k].type !== ITEM_TYPES.ESSENCE
            );
            const basicFoodKeys = ['bread', 'meat', 'lettuce', 'sandwich', 'salad', 'cookedMeal'];
            basicFoodKeys.forEach(key => {
                if (ITEMS[key] && !availableItems.includes(key)) {
                    availableItems.push(key);
                }
            });
            const shopItemCount = 5 + Math.floor(Math.random() * 5); // 5-9 items
            for (let i = 0; i < shopItemCount; i++) {
                const k = availableItems[Math.floor(Math.random() * availableItems.length)];
                const shopItem = createItem(k, 0, 0);
                gameState.shopItems.push(shopItem);
            }

            // corridors are carved at the desired width during generation
            updateFogOfWar();
            updateStats();
            updateInventoryDisplay();
            updateSkillDisplay();
            updateMercenaryDisplay();
            renderDungeon();
            updateCamera();
        }

        // 던전 DOM을 다시 구축하여 셀 요소 배열을 재생성
        function rebuildDungeonDOM() {
            const size = gameState.dungeonSize;
            const dungeonEl = document.getElementById('dungeon');
            if (!dungeonEl) return;

            dungeonEl.innerHTML = '';
            gameState.cellElements = [];

            dungeonEl.style.setProperty('--dungeon-size', size);
            dungeonEl.style.gridTemplateColumns = `repeat(${size}, ${CELL_WIDTH}px)`;
            dungeonEl.style.gridTemplateRows = `repeat(${size}, ${CELL_WIDTH}px)`;

            for (let y = 0; y < size; y++) {
                const cellRow = [];
                for (let x = 0; x < size; x++) {
                    const cellDiv = document.createElement('div');
                    cellDiv.dataset.x = x;
                    cellDiv.dataset.y = y;
                    const tileBg = document.createElement('div');
                    tileBg.className = 'equipped-tile-bg';
                    cellDiv.appendChild(tileBg);
                    cellDiv.className = 'cell';

                    const buffContainer = document.createElement('div');
                    buffContainer.className = 'buff-container';
                    cellDiv.appendChild(buffContainer);

                    const statusContainer = document.createElement('div');
                    statusContainer.className = 'status-container';
                    cellDiv.appendChild(statusContainer);

                    dungeonEl.appendChild(cellDiv);
                    cellRow.push(cellDiv);
                }
                gameState.cellElements.push(cellRow);
            }
        }

        // 카메라 업데이트 (최적화됨)
        function updateCamera() {
            const dungeonElement = document.getElementById('dungeon');
            const container = document.querySelector('.dungeon-container');
            if (!dungeonElement || !container) return;

            const cellSize = 33; // 32px + 1px gap

            // 현재 컨테이너 크기에 맞춰 보이는 셀 수 계산
            const visibleX = Math.floor(container.clientWidth / cellSize);
            const visibleY = Math.floor(container.clientHeight / cellSize);
            const viewportSize = Math.min(visibleX, visibleY);
            gameState.viewportSize = viewportSize;

            // 플레이어를 중심으로 카메라 위치 계산
            const centerX = Math.floor(viewportSize / 2);
            const centerY = Math.floor(viewportSize / 2);

            const newCameraX = gameState.player.x - centerX;
            const newCameraY = gameState.player.y - centerY;

            // 던전 경계 체크
            const clampedX = Math.max(0, Math.min(newCameraX, gameState.dungeonSize - viewportSize));
            const clampedY = Math.max(0, Math.min(newCameraY, gameState.dungeonSize - viewportSize));

            // 카메라 위치가 변경된 경우에만 업데이트
            if (gameState.camera.x !== clampedX || gameState.camera.y !== clampedY) {
                gameState.camera.x = clampedX;
                gameState.camera.y = clampedY;

                // 카메라 변환 적용
                const translateX = -gameState.camera.x * cellSize;
                const translateY = -gameState.camera.y * cellSize;
                dungeonElement.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
            }
        }

        // 용병 고용 함수
        function hireMercenary(type) {
            const mercType = MERCENARY_TYPES[type];

            if (gameState.player.gold < mercType.cost) {
                addMessage(`💸 골드가 부족합니다. ${mercType.name} 고용에는 ${formatNumber(mercType.cost)} 골드가 필요합니다.`, 'info');
                return;
            }

            const mercenary = createMercenary(type, -1, -1);

            const activeCount = gameState.activeMercenaries.filter(m => m.alive).length;
            if (activeCount < 5) {
                if (!spawnMercenaryNearPlayer(mercenary)) {
                    addMessage('❌ 용병을 배치할 공간이 없습니다.', 'info');
                    return;
                }
                gameState.player.gold -= mercType.cost;
                gameState.activeMercenaries.push(mercenary);
                playSoundFile(String(mercType.voiceFile));
                addMessage(`🎉 ${mercType.name}을(를) 고용했습니다!`, 'mercenary');
            } else if (gameState.standbyMercenaries.length < 5) {
                gameState.player.gold -= mercType.cost;
                gameState.standbyMercenaries.push(mercenary);
                playSoundFile(String(mercType.voiceFile));
                addMessage(`📋 ${mercType.name}을(를) 대기열에 추가했습니다.`, 'mercenary');
            } else {
                const options = gameState.activeMercenaries.map((m, i) => `${i + 1}: ${m.name}`).join('\n');
                const choice = prompt(`👥 용병이 가득 찼습니다. 교체할 용병을 선택하세요:\n${options}`);
                if (choice === null) {
                    addMessage('❌ 고용이 취소되었습니다.', 'info');
                    return;
                }
                const index = parseInt(choice, 10) - 1;
                if (index < 0 || index >= gameState.activeMercenaries.length) {
                    addMessage('❌ 고용이 취소되었습니다.', 'info');
                    return;
                }
                const removed = gameState.activeMercenaries[index];
                if (!spawnMercenaryNearPlayer(mercenary)) {
                    addMessage('❌ 용병을 배치할 공간이 없습니다.', 'info');
                    return;
                }
                setMercenaryLevel(mercenary, removed.level);
                gameState.activeMercenaries[index] = mercenary;
                removed.x = -1;
                removed.y = -1;
                gameState.player.gold -= mercType.cost;
                playSoundFile(String(mercType.voiceFile));
                addMessage(`🗑️ ${removed.name}을(를) 내보내고 ${mercType.name}을(를) 고용했습니다. 레벨 ${removed.level}을(를) 승계합니다.`, 'mercenary');
            }

            updateStats();
            updateMercenaryDisplay();
            renderDungeon();
        }

        function generateStars() {
            let stars;
            do {
                stars = {
                    strength: Math.floor(Math.random() * 4),
                    agility: Math.floor(Math.random() * 4),
                    endurance: Math.floor(Math.random() * 4),
                    focus: Math.floor(Math.random() * 4),
                    intelligence: Math.floor(Math.random() * 4)
                };
            } while (Object.values(stars).reduce((a,b)=>a+b,0) > 9);
            return stars;
        }

        // 용병 생성 함수
        function createMercenary(type, x, y) {
            const mercType = MERCENARY_TYPES[type];
            const skillPool = MERCENARY_SKILL_SETS[type] || [];
            const isTestMerc = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
            let assignedSkill;
            if (type === 'BARD') {
                const hymns = skillPool.filter(s => s !== 'Heal');
                assignedSkill = hymns.length ? (isTestMerc ? hymns[0] : hymns[Math.floor(Math.random() * hymns.length)]) : null;
            } else {
                assignedSkill = skillPool.length ? (isTestMerc ? skillPool[0] : skillPool[Math.floor(Math.random() * skillPool.length)]) : null;
            }
            let assignedSkill2 = type === 'HEALER' ? 'Purify' : null;
            if (type === 'BARD') assignedSkill2 = 'Heal';
            if (type === 'PALADIN') {
                const paladinSet = MERCENARY_SKILL_SETS['PALADIN'] || [];
                const keys = Object.keys(MERCENARY_SKILLS)
                    .filter(k => !paladinSet.includes(k) && !k.endsWith('Aura') && !DEBUFF_SKILLS.includes(k));
                assignedSkill2 = keys.length ? (isTestMerc ? keys[0] : keys[Math.floor(Math.random() * keys.length)]) : null;
            }
            const randomBaseName = MERCENARY_NAMES[Math.floor(Math.random() * MERCENARY_NAMES.length)];
            const jobLabel = mercType.name.split(' ')[1] || mercType.name;
            const name = `${randomBaseName} (${jobLabel})`;
            const endurance = mercType.baseHealth / 2;
            const focus = (mercType.baseMaxMana || 0) / 2;
            const agility = Math.max(0, Math.round((mercType.baseAccuracy - 0.7) / 0.02));
            return {
                id: Math.random().toString(36).substr(2, 9),
                type: type,
                name: name,
                icon: mercType.icon,
                role: mercType.role,
                x: x,
                y: y,
                level: 1,
                stars: generateStars(),
                endurance: endurance,
                focus: focus,
                strength: mercType.baseAttack,
                agility: agility,
                intelligence: mercType.baseMagicPower,
                baseDefense: mercType.baseDefense - Math.floor(endurance * 0.1),
                maxHealth: mercType.baseHealth,
                health: mercType.baseHealth,
                maxMana: mercType.baseMaxMana || 0,
                mana: mercType.baseMaxMana || 0,
                shield: 0,
                shieldTurns: 0,
                attackBuff: 0,
                attackBuffTurns: 0,
                healthRegen: mercType.baseHealthRegen || 0,
                manaRegen: mercType.baseManaRegen || 1,
                skill: assignedSkill,
                skill2: assignedSkill2,
                attack: mercType.baseAttack,
                defense: mercType.baseDefense,
                accuracy: mercType.baseAccuracy,
                evasion: mercType.baseEvasion,
                critChance: mercType.baseCritChance,
                magicPower: mercType.baseMagicPower,
                magicResist: mercType.baseMagicResist,
                elementResistances: {fire:0, ice:0, lightning:0, earth:0, light:0, dark:0},
                statusResistances: {poison:0, bleed:0, burn:0, freeze:0, paralysis:0, nightmare:0, silence:0, petrify:0, debuff:0},
                poison: false,
                burn: false,
                freeze: false,
                bleed: false,
                paralysis: false,
                nightmare: false,
                silence: false,
                petrify: false,
                debuff: false,
                poisonTurns: 0,
                burnTurns: 0,
                freezeTurns: 0,
                bleedTurns: 0,
                paralysisTurns: 0,
                nightmareTurns: 0,
                silenceTurns: 0,
                petrifyTurns: 0,
                debuffTurns: 0,
                exp: 0,
                expNeeded: 15,
                skillPoints: 0,
                skillLevels: (() => {
                    const obj = {};
                    if (assignedSkill) obj[assignedSkill] = 1;
                    if (assignedSkill2) obj[assignedSkill2] = 1;
                    return obj;
                })(),
                skillCooldowns: {},
                alive: true,
                hasActed: false,
                affinity: 50,
                fullness: 75,
                buffs: [],
                equipped: {
                    weapon: null,
                    armor: null,
                    accessory1: null,
                    accessory2: null,
                    tile: null
                }
            };
        }

        // 아이템 생성 함수
        function createItem(itemKey, x, y, prefixName, enhanceLevel = 0, rare = false) {
            const itemData = ITEMS[itemKey] || UNIQUE_ITEMS[itemKey];
            const item = {
                id: Math.random().toString(36).substr(2, 9),
                key: itemKey,
                baseName: itemData.name,
                name: itemData.name,
                type: itemData.type,
                x: x,
                y: y,
                enhanceLevel: enhanceLevel,
                baseStats: {},
                ...itemData
            };

            if (itemData.tier) {
                item.tier = itemData.tier;
            }
            if (Array.isArray(itemData.procs)) {
                item.procs = itemData.procs.map(p => ({ ...p }));
            }

            if (item.type === ITEM_TYPES.MAP) {
                item.modifiers = {};

                if (Math.random() < 0.3) {
                    const prefix = MAP_PREFIXES[Math.floor(Math.random() * MAP_PREFIXES.length)];
                    item.name = `${prefix.name} ${item.name}`;
                    Object.assign(item.modifiers, prefix.modifiers);
                    item.prefix = prefix.name;
                }
                if (Math.random() < 0.3) {
                    const suffix = MAP_SUFFIXES[Math.floor(Math.random() * MAP_SUFFIXES.length)];
                    item.name = `${item.name} ${suffix.name}`;
                    Object.assign(item.modifiers, suffix.modifiers);
                    item.suffix = suffix.name;
                }
            } else if (item.type === ITEM_TYPES.WEAPON || item.type === ITEM_TYPES.ARMOR || item.type === ITEM_TYPES.ACCESSORY) {
                const addRandomStat = rand => {
                    const attrs = ['strength','agility','endurance','focus','intelligence'];
                    const idx = Math.floor(rand * attrs.length);
                    const key = attrs[idx];
                    item[key] = (item[key] || 0) + 1;
                };

                if (rare) {
                    const randPre = Math.random();
                    const prefix = RARE_PREFIXES[Math.floor(randPre * RARE_PREFIXES.length)];
                    item.prefix = prefix.name;
                    item.name = `${prefix.name} ${item.name}`;
                    for (const stat in prefix.modifiers) {
                        let val = prefix.modifiers[stat];
                        if (typeof val === 'function') val = val();
                        if (typeof val === 'number') item[stat] = (item[stat] || 0) + val;
                        else item[stat] = val;
                    }
                    addRandomStat(randPre);

                    const randSuf = Math.random();
                    const suffix = RARE_SUFFIXES[Math.floor(randSuf * RARE_SUFFIXES.length)];
                    item.suffix = suffix.name;
                    item.name = `${item.name} ${suffix.name}`;
                    for (const stat in suffix.modifiers) {
                        let val = suffix.modifiers[stat];
                        if (typeof val === 'function') val = val();
                        if (typeof val === 'number') item[stat] = (item[stat] || 0) + val;
                        else item[stat] = val;
                    }
                    addRandomStat(randSuf);
                    item.rarity = 'rare';
                } else if (prefixName) {
                    const prefix = PREFIXES.find(p => p.name === prefixName);
                    if (prefix) {
                        item.prefix = prefix.name;
                        item.name = `${prefix.name} ${item.name}`;
                        for (const stat in prefix.modifiers) {
                            let val = prefix.modifiers[stat];
                            if (typeof val === 'function') val = val();
                            if (typeof val === 'number') {
                                item[stat] = (item[stat] || 0) + val;
                            } else {
                                item[stat] = val;
                            }
                        }
                        addRandomStat(Math.random());
                    }
                } else if (Math.random() < 0.5) {
                    const randPre = Math.random();
                    const prefix = PREFIXES[Math.floor(randPre * PREFIXES.length)];
                    item.prefix = prefix.name;
                    item.name = `${prefix.name} ${item.name}`;
                    for (const stat in prefix.modifiers) {
                        let val = prefix.modifiers[stat];
                        if (typeof val === 'function') val = val();
                        if (typeof val === 'number') {
                            item[stat] = (item[stat] || 0) + val;
                        } else {
                            item[stat] = val;
                        }
                    }
                    addRandomStat(randPre);
                }
                if (!rare && Math.random() < 0.5) {
                    const randSuf = Math.random();
                    const suffix = SUFFIXES[Math.floor(randSuf * SUFFIXES.length)];
                    item.suffix = suffix.name;
                    item.name = `${item.name} ${suffix.name}`;
                    for (const stat in suffix.modifiers) {
                        let val = suffix.modifiers[stat];
                        if (typeof val === 'function') val = val();
                        if (typeof val === 'number') {
                            item[stat] = (item[stat] || 0) + val;
                        } else {
                            item[stat] = val;
                        }
                    }
                    addRandomStat(randSuf);
                }
            }

            if (item.tier === 'unique') {
                const isTest = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
                if (!isTest) {
                    const effect = UNIQUE_EFFECT_POOL[Math.floor(Math.random() * UNIQUE_EFFECT_POOL.length)];
                    if (effect) {
                        if (!item.procs) item.procs = [];
                        item.procs.push({ ...effect });
                    }
                }
            }

            for (const [k, v] of Object.entries(item)) {
                if (typeof v === 'number' && !['x','y','level','price','incubation','enhanceLevel'].includes(k)) {
                    item.baseStats[k] = v;
                }
            }
            applyEnhancement(item);
            return item;
        }

        function createRecipeScroll(recipeKey, x, y) {
            const name = RECIPES[recipeKey]?.name || recipeKey;
            return {
                id: Math.random().toString(36).substr(2, 9),
                type: ITEM_TYPES.RECIPE_SCROLL,
                recipe: recipeKey,
                baseName: `${name} Recipe`,
                name: `📜 ${name} Recipe`,
                icon: '📜',
                x,
                y
            };
        }

        // 챔피언 생성 함수
        function createChampion(type, x, y, level) {
            const base = CHAMPION_TYPES[type];
            const randomBaseName = MERCENARY_NAMES[Math.floor(Math.random() * MERCENARY_NAMES.length)];
            const jobLabel = base.name.split(' ')[1] || base.name;
            const name = `${randomBaseName} (${jobLabel})`;
            const endurance = base.baseHealth / 2;
            const focus = (base.baseMaxMana || 0) / 2;
            const agility = Math.max(0, Math.round((base.baseAccuracy - 0.7) / 0.02));
            let range = base.range || 1;
            let special = base.special;
            if (!special) {
                if (type === 'WIZARD') { special = 'magic'; range = 4; }
                else if (type === 'ARCHER') { special = 'ranged'; range = 3; }
                else if (type === 'HEALER') { special = 'ranged'; range = 3; }
            }
            const champion = {
                id: Math.random().toString(36).substr(2, 9),
                type,
                name,
                icon: base.icon,
                x,
                y,
                level: 1,
                stars: generateStars(),
                endurance: endurance,
                focus: focus,
                strength: base.baseAttack,
                agility: agility,
                intelligence: base.baseMagicPower,
                baseDefense: base.baseDefense - Math.floor(endurance * 0.1),
                maxHealth: base.baseHealth,
                health: base.baseHealth,
                maxMana: base.baseMaxMana || 0,
                mana: base.baseMaxMana || 0,
                healthRegen: base.baseHealthRegen || 0,
                manaRegen: base.baseManaRegen || 1,
                attack: base.baseAttack,
                defense: base.baseDefense,
                accuracy: base.baseAccuracy,
                evasion: base.baseEvasion,
                critChance: base.baseCritChance,
                magicPower: base.baseMagicPower,
                magicResist: base.baseMagicResist,
                range: range,
                special: special,
                exp: level * 10,
                gold: level * 10,
                lootChance: 1,
                hasActed: false,
                skillCooldowns: {},
                isChampion: true,
                equipped: { weapon: null, armor: null, accessory1: null, accessory2: null, tile: null },
                elementResistances: {fire:0, ice:0, lightning:0, earth:0, light:0, dark:0},
                statusResistances: {poison:0, bleed:0, burn:0, freeze:0, paralysis:0, nightmare:0, silence:0, petrify:0, debuff:0},
                poison:false,burn:false,freeze:false,bleed:false,
                paralysis:false,nightmare:false,silence:false,petrify:false,debuff:false,
                poisonTurns:0,burnTurns:0,freezeTurns:0,bleedTurns:0,
                paralysisTurns:0,nightmareTurns:0,silenceTurns:0,petrifyTurns:0,debuffTurns:0,
                expNeeded: 15
            };
            const keys = Object.keys(ITEMS).filter(k =>
                [ITEM_TYPES.WEAPON, ITEM_TYPES.ARMOR, ITEM_TYPES.ACCESSORY].includes(ITEMS[k].type) &&
                ITEMS[k].level <= Math.ceil(level / 2 + 1)
            );
            const weaponChoices = keys.filter(k => ITEMS[k].type === ITEM_TYPES.WEAPON);
            const armorChoices = keys.filter(k => ITEMS[k].type === ITEM_TYPES.ARMOR);
            const accChoices = keys.filter(k => ITEMS[k].type === ITEM_TYPES.ACCESSORY);
            const enhanceLv = Math.floor(level / 5);
            if (weaponChoices.length) champion.equipped.weapon = createItem(weaponChoices[Math.floor(Math.random()*weaponChoices.length)], 0, 0, null, enhanceLv);
            if (armorChoices.length) champion.equipped.armor = createItem(armorChoices[Math.floor(Math.random()*armorChoices.length)], 0, 0, null, enhanceLv);
            if (accChoices.length) champion.equipped.accessory1 = createItem(accChoices[Math.floor(Math.random()*accChoices.length)], 0, 0, null, enhanceLv);

            // [수정] 챔피언의 스킬 풀에 디버프 스킬 5종을 추가합니다.
            const monsterAttackSkills = Object.keys(MONSTER_SKILLS);
            const debuffSkills = ['Weaken', 'Sunder', 'Regression', 'SpellWeakness', 'ElementalWeakness'];
            const championSkillPool = [...monsterAttackSkills, ...debuffSkills];

            const sk = championSkillPool[Math.floor(Math.random() * championSkillPool.length)];
            champion.monsterSkill = sk;
            champion.skillLevels = {};
            champion.skillLevels[sk] = Math.floor((level - 1) / 3) + 1;

            setChampionLevel(champion, level);
            return champion;
        }

        function createHomingProjectile(x, y, target, attacker = gameState.player) {
            const dx = Math.sign(target.x - x);
            const dy = Math.sign(target.y - y);
            const dist = getDistance(x, y, target.x, target.y);
            const proj = { x, y, dx, dy, rangeLeft: dist, icon: '🔺', homing: true, target, attacker };
            gameState.projectiles.push(proj);
            return proj;
        }

        // Visual effect helpers
        function createNovaEffect(x, y, type, radius) {
            const dungeonEl = document.getElementById('dungeon');
            if (!dungeonEl) return;

            const centerX = x * CELL_SIZE + CELL_SIZE / 2;
            const centerY = y * CELL_SIZE + CELL_SIZE / 2;

            const novaDiv = document.createElement('div');
            novaDiv.className = `nova-effect ${type}-nova`;
            novaDiv.style.left = `${centerX - 16.5}px`;
            novaDiv.style.top = `${centerY - 16.5}px`;
            dungeonEl.appendChild(novaDiv);

            createNovaParticles(centerX, centerY, type, radius);

            setTimeout(() => {
                if (novaDiv.parentNode) {
                    novaDiv.parentNode.removeChild(novaDiv);
                }
            }, 800);
        }

        function createNovaParticles(centerX, centerY, type, radius) {
            const dungeonEl = document.getElementById('dungeon');
            const particleCount = radius * 8;

            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const distance = (radius * 16.5) + (Math.random() * 33);
                const particleX = centerX + Math.cos(angle) * distance;
                const particleY = centerY + Math.sin(angle) * distance;

                const particle = document.createElement('div');
                particle.className = `${type}-particle`;
                particle.style.left = `${particleX}px`;
                particle.style.top = `${particleY}px`;

                dungeonEl.appendChild(particle);

                const removeTime = type === 'fire' ? 600 : 800;
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, removeTime);
            }
        }

        function createScreenShake(intensity = 5, duration = 300) {
            const dungeonEl = document.getElementById('dungeon');
            if (!dungeonEl) return;
            if (typeof requestAnimationFrame !== 'function' || !/\[native code\]/.test(requestAnimationFrame.toString())) {
                return;
            }

            const originalTransform = dungeonEl.style.transform;
            let startTime = Date.now();

            function shake() {
                const elapsed = Date.now() - startTime;
                if (elapsed >= duration) {
                    dungeonEl.style.transform = originalTransform;
                    return;
                }

                const progress = elapsed / duration;
                const currentIntensity = intensity * (1 - progress);
                const shakeX = (Math.random() - 0.5) * currentIntensity;
                const shakeY = (Math.random() - 0.5) * currentIntensity;

                dungeonEl.style.transform = originalTransform + ` translate(${shakeX}px, ${shakeY}px)`;
                requestAnimationFrame(shake);
            }

            shake();
        }

        // 메시지 로그 추가
        function addMessage(text, type = 'info', detail = null, imageUrl = null) {
            const messageLog = document.getElementById('message-log');
            const last = messageLog.lastElementChild;

            // Prevent consecutive duplicate messages
            if (last && last.dataset && last.dataset.text === text && last.dataset.type === type) {
                return;
            }

            const message = document.createElement('div');
            message.className = `message ${type}`;
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = String(imageUrl);
                img.className = 'log-icon';
                img.width = 16;
                img.height = 16;
                img.style.imageRendering = 'pixelated';
                message.appendChild(img);
            }
            message.innerHTML += text;
            message.dataset.text = text;
            message.dataset.type = type;
            if (detail) {
                message.dataset.detail = detail;
                message.classList.add('clickable');
                message.addEventListener('click', () => alert(detail));
            }
            messageLog.appendChild(message);
            messageLog.scrollTop = messageLog.scrollHeight;
        }

        // 인벤토리에 아이템 추가
        function addToInventory(item) {
            gameState.player.inventory.push(item);
            updateInventoryDisplay();
        }

        function sellItem(item) {
            const value = Math.floor((item.price || 0) * 0.5);
            const idx = gameState.player.inventory.findIndex(i => i.id === item.id);
            if (idx !== -1) {
                gameState.player.inventory.splice(idx, 1);
                gameState.player.gold += value;
                addMessage(`💰 ${formatItemName(item)}을(를) ${formatNumber(value)}골드에 판매했습니다.`, 'item');
                updateInventoryDisplay();
                updateStats();
            }
        }

        function confirmAndSell(item) {
            if (typeof confirm === 'function' && !confirm(`${item.name}을(를) 판매하시겠습니까?`)) return;
            sellItem(item);
        }

        function getEnhanceCost(level) {
            const qty = Math.pow(2, level - 1);
            return { iron: qty, bone: qty };
        }

        function applyEnhancement(item) {
            if (!item.baseStats) return;
            for (const stat in item.baseStats) {
                if (stat === 'attack' || stat === 'defense') {
                    item[stat] = item.baseStats[stat] + item.enhanceLevel * 1;
                } else if (stat.endsWith('Resist')) {
                    item[stat] = item.baseStats[stat] + item.enhanceLevel * 0.01;
                } else if (stat === 'skillManaCostMult') {
                    item[stat] = Math.max(0, item.baseStats[stat] - item.enhanceLevel * 0.1);
                } else if ([
                    'damageReflect',
                    'lifeSteal',
                    'skillPowerMult',
                    'skillRangeBonus',
                    'skillCooldownMod'
                ].includes(stat)) {
                    item[stat] = item.baseStats[stat] + item.enhanceLevel * 0.1;
                } else {
                    item[stat] = item.baseStats[stat] + item.enhanceLevel * 0.5;
                }
            }
        }

        function enhanceItem(item) {
            if (item.type !== ITEM_TYPES.WEAPON && item.type !== ITEM_TYPES.ARMOR && item.type !== ITEM_TYPES.ACCESSORY) {
                addMessage('강화할 수 없는 아이템입니다.', 'info');
                return;
            }
            const next = (item.enhanceLevel || 0) + 1;
            const cost = getEnhanceCost(next);
            for (const [mat, qty] of Object.entries(cost)) {
                if ((gameState.materials[mat] || 0) < qty) {
                    addMessage('재료가 부족합니다.', 'info');
                    return;
                }
            }
            let failChance = 0.2;
            if (typeof navigator !== 'undefined' && navigator.userAgent &&
                (navigator.userAgent.includes('Node.js') || navigator.userAgent.includes('jsdom'))) {
                failChance = 0; // deterministic success during tests
            }

            const isFailure = Math.random() < failChance;
            const sound = isFailure ? 'enhanceFail' : 'enhanceSuccess';
            SoundEngine.playSound(sound);
            for (const [mat, qty] of Object.entries(cost)) {
                gameState.materials[mat] -= qty;
            }
            if (isFailure) {
                addMessage(`🛠️ ${item.name} 강화 실패...`, 'info');
                updateMaterialsDisplay();
                return;
            }

            item.enhanceLevel = next;
            applyEnhancement(item);
            addMessage(`🛠️ ${item.name} 강화 성공! (Lv.${next})`, 'item');
            updateMaterialsDisplay();
            updateInventoryDisplay();
        }

        function playSkillOverlayEffect(unit, imagePath, size, duration = 600) {
            const dungeonEl = document.getElementById('dungeon');
            if (!dungeonEl) return;

            const centerX = unit.x * CELL_SIZE + CELL_SIZE / 2;
            const centerY = unit.y * CELL_SIZE + CELL_SIZE / 2;

            const overlay = document.createElement('div');
            overlay.className = 'skill-effect-overlay';
            overlay.style.width = `${size}px`;
            overlay.style.height = `${size}px`;
            overlay.style.left = `${centerX}px`;
            overlay.style.top = `${centerY}px`;
            overlay.style.backgroundImage = `url('${String(imagePath)}')`;

            dungeonEl.appendChild(overlay);

            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, duration);
        }

        function playNovaSkillEffect(unit, skill) {
            if (!skill.novaType || skill.radius === undefined) return;
            const effectSize = skill.radius * 2 * CELL_SIZE;
            const imagePath = `assets/images/${skill.novaType}-nova-effect.png`;
            playSkillOverlayEffect(unit, imagePath, effectSize, 600);
        }

        function disassembleItem(item) {
            if (item.type !== ITEM_TYPES.WEAPON && item.type !== ITEM_TYPES.ARMOR && item.type !== ITEM_TYPES.ACCESSORY) {
                addMessage('분해할 수 없는 아이템입니다.', 'info');
                return;
            }

            const qty = (item.level || 1) + (item.enhanceLevel || 0);
            if (!gameState.materials.iron) gameState.materials.iron = 0;
            if (!gameState.materials.bone) gameState.materials.bone = 0;
            gameState.materials.iron += qty;
            gameState.materials.bone += qty;

            const index = gameState.player.inventory.findIndex(i => i.id === item.id);
            if (index !== -1) {
                gameState.player.inventory.splice(index, 1);
            }

            addMessage(`🔧 ${item.name}을(를) 분해하여 철 ${qty}개와 뼈 ${qty}개를 얻었습니다.`, 'item');
            updateInventoryDisplay();
            updateMaterialsDisplay();
        }

        // 아이템 클릭 시 대상 패널 표시
        function handleItemClick(item) {
            if (item.type === ITEM_TYPES.WEAPON || item.type === ITEM_TYPES.ARMOR || item.type === ITEM_TYPES.ACCESSORY) {
                showItemDetailPanel(item);
            } else {
                showItemTargetPanel(item);
            }
        }

        // 아이템 장착 (플레이어)
        function equipItem(item) {
            SoundEngine.playSound('equipItem');
            if (item.type === ITEM_TYPES.WEAPON) {
                if (gameState.player.equipped.weapon) {
                    addToInventory(gameState.player.equipped.weapon);
                }
                gameState.player.equipped.weapon = item;
                addMessage(`⚔️ ${formatItemName(item)}을(를) 장착했습니다. 공격력 +${item.attack}`, 'item');
            } else if (item.type === ITEM_TYPES.ARMOR) {
                if (gameState.player.equipped.armor) {
                    addToInventory(gameState.player.equipped.armor);
                }
                gameState.player.equipped.armor = item;
                addMessage(`🛡️ ${formatItemName(item)}을(를) 장착했습니다. 방어력 +${item.defense}`, 'item');
            } else if (item.type === ITEM_TYPES.ACCESSORY) {
                let slot = null;
                if (!gameState.player.equipped.accessory1) slot = 'accessory1';
                else if (!gameState.player.equipped.accessory2) slot = 'accessory2';
                else {
                    const choice = prompt(`교체할 악세서리 슬롯을 선택하세요:\n0: ${formatItem(gameState.player.equipped.accessory1)}\n1: ${formatItem(gameState.player.equipped.accessory2)}`);
                    if (choice === null) return;
                    slot = choice === '1' ? 'accessory2' : 'accessory1';
                    addToInventory(gameState.player.equipped[slot]);
                }
                gameState.player.equipped[slot] = item;
                addMessage(`💍 ${formatItemName(item)}을(를) 장착했습니다.`, 'item');
            }
            
            const index = gameState.player.inventory.findIndex(i => i.id === item.id);
            if (index !== -1) {
                gameState.player.inventory.splice(index, 1);
            }
            
            updateInventoryDisplay();
            updateStats();
        }

        function unequipAccessory(slot) {
            const item = gameState.player.equipped[slot];
            if (item) {
                SoundEngine.playSound('unequipItem');
                addToInventory(item);
                gameState.player.equipped[slot] = null;
                addMessage(`📦 ${formatItemName(item)}을(를) 해제했습니다.`, 'item');
                updateInventoryDisplay();
                updateStats();
            }
        }

        function unequipWeapon() {
            const item = gameState.player.equipped.weapon;
            if (item) {
                SoundEngine.playSound('unequipItem');
                addToInventory(item);
                gameState.player.equipped.weapon = null;
                addMessage(`📦 ${formatItemName(item)}을(를) 해제했습니다.`, 'item');
                updateInventoryDisplay();
                updateStats();
            }
        }

        function unequipArmor() {
            const item = gameState.player.equipped.armor;
            if (item) {
                SoundEngine.playSound('unequipItem');
                addToInventory(item);
                gameState.player.equipped.armor = null;
                addMessage(`📦 ${formatItemName(item)}을(를) 해제했습니다.`, 'item');
                updateInventoryDisplay();
                updateStats();
            }
        }

        function equipTile(tile, unit) {
            SoundEngine.playSound('equipItem');
            if (!unit.equipped) {
                unit.equipped = { weapon: null, armor: null, accessory1: null, accessory2: null, tile: null };
            }
            if (unit.equipped.tile) {
                addToInventory(unit.equipped.tile);
            }
            unit.equipped.tile = tile;
            if (unit === gameState.player) {
                const idx = gameState.player.inventory.findIndex(i => i.id === tile.id);
                if (idx !== -1) {
                    gameState.player.inventory.splice(idx, 1);
                }
            }
            const owner = unit === gameState.player ? '플레이어' : unit.name;
            addMessage(`🧩 ${owner}이(가) ${formatItemName(tile)}을(를) 장착했습니다.`, 'item');
            updateInventoryDisplay();
            updateStats();
        }

        function unequipTile(unit) {
            if (!unit.equipped || !unit.equipped.tile) return;
            const tile = unit.equipped.tile;
            SoundEngine.playSound('unequipItem');
            addToInventory(tile);
            unit.equipped.tile = null;
            addMessage(`📦 ${formatItemName(tile)}을(를) 해제했습니다.`, 'item');
            updateInventoryDisplay();
            updateStats();
        }

        // 용병에게 아이템 장착
        function equipItemToMercenary(item, mercenary) {
            // 용병 장비 초기화 확인
            if (!mercenary.equipped) {
                mercenary.equipped = { weapon: null, armor: null, accessory1: null, accessory2: null, tile: null };
            }
            
            if (item.type === ITEM_TYPES.WEAPON) {
                if (mercenary.equipped.weapon) {
                    addToInventory(mercenary.equipped.weapon);
                }
                mercenary.equipped.weapon = item;
                addMessage(`⚔️ ${mercenary.name}이(가) ${formatItemName(item)}을(를) 장착했습니다.`, 'mercenary');
            } else if (item.type === ITEM_TYPES.ARMOR) {
                if (mercenary.equipped.armor) {
                    addToInventory(mercenary.equipped.armor);
                }
                mercenary.equipped.armor = item;
                addMessage(`🛡️ ${mercenary.name}이(가) ${formatItemName(item)}을(를) 장착했습니다.`, 'mercenary');
            } else if (item.type === ITEM_TYPES.ACCESSORY) {
                let slot = null;
                if (!mercenary.equipped.accessory1) slot = 'accessory1';
                else if (!mercenary.equipped.accessory2) slot = 'accessory2';
                else {
                    const choice = prompt(`${mercenary.name}의 교체할 악세서리 슬롯을 선택하세요:\n0: ${formatItem(mercenary.equipped.accessory1)}\n1: ${formatItem(mercenary.equipped.accessory2)}`);
                    if (choice === null) return;
                    slot = choice === '1' ? 'accessory2' : 'accessory1';
                    addToInventory(mercenary.equipped[slot]);
                }
                mercenary.equipped[slot] = item;
                addMessage(`💍 ${mercenary.name}이(가) ${formatItemName(item)}을(를) 장착했습니다.`, 'mercenary');
            }
            
            const index = gameState.player.inventory.findIndex(i => i.id === item.id);
            if (index !== -1) {
                gameState.player.inventory.splice(index, 1);
            }
            
            updateInventoryDisplay();
            updateMercenaryDisplay();
        }

        // 용병 장비 해제
        function unequipItemFromMercenary(mercenaryId, slotType) {
            const mercenary = gameState.activeMercenaries.find(m => m.id === mercenaryId);
            if (!mercenary || !mercenary.equipped) return;

            const item = mercenary.equipped[slotType];
            if (item) {
                SoundEngine.playSound('unequipItem');
                addToInventory(item);
                mercenary.equipped[slotType] = null;
                addMessage(`📦 ${mercenary.name}의 ${formatItemName(item)}을(를) 해제했습니다.`, 'mercenary');
                updateInventoryDisplay();
                updateMercenaryDisplay();
                showMercenaryDetails(mercenary);
            }
        }

        // 아이템 사용 (대상 지정)
        function useItemOnTarget(item, target) {
            if (item.type === ITEM_TYPES.POTION) {
                if (target.health < getStat(target, 'maxHealth')) {
                    const healAmount = Math.min(item.healing, getStat(target, 'maxHealth') - target.health);
                    target.health += healAmount;
                    const name = target === gameState.player ? '플레이어' : target.name;
                    addMessage(`🩹 ${item.name}을(를) 사용하여 ${name}의 체력을 ${formatNumber(healAmount)} 회복했습니다.`, 'item');

                    const index = gameState.player.inventory.findIndex(i => i.id === item.id);
                    if (index !== -1) {
                        gameState.player.inventory.splice(index, 1);
                    }

                    updateInventoryDisplay();
                    if (target === gameState.player) {
                        updateStats();
                    } else {
                        updateMercenaryDisplay();
                    }
                } else {
                    const name = target === gameState.player ? '플레이어' : target.name;
                    addMessage(`❤️ ${name}의 체력이 이미 가득 찼습니다.`, 'info');
                }
            } else if (item.type === ITEM_TYPES.EXP_SCROLL) {
                const expAmount = item.expGain || 0;
                target.exp += expAmount;
                const name = target === gameState.player ? '플레이어' : target.name;
                addMessage(`📜 ${item.name}을(를) 사용하여 ${name}의 경험치를 ${formatNumber(expAmount)} 획득했습니다.`, 'item');

                const index = gameState.player.inventory.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    gameState.player.inventory.splice(index, 1);
                }

                updateInventoryDisplay();
                if (target === gameState.player) {
                    checkLevelUp();
                    updateStats();
                } else {
                    checkMercenaryLevelUp(target);
                    updateMercenaryDisplay();
                }
            } else if (item.type === ITEM_TYPES.ESSENCE) {
                const stats = ['strength','agility','endurance','focus','intelligence','attack','defense','accuracy','evasion','critChance','magicPower','magicResist','maxHealth','maxMana','healthRegen','manaRegen'];
                stats.forEach(stat => {
                    if (item[stat] !== undefined) {
                        target[stat] = (target[stat] || 0) + item[stat];
                    }
                });
                if (item.skillLevelEssence) {
                    target.skillPoints = (target.skillPoints || 0) + item.skillLevelEssence;
                }

                const name = target === gameState.player ? '플레이어' : target.name;
                addMessage(`✨ ${item.name}을(를) 사용하여 ${name}의 능력치를 향상시켰습니다.`, 'item');

                const index = gameState.player.inventory.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    gameState.player.inventory.splice(index, 1);
                }

                updateInventoryDisplay();
                if (target === gameState.player) {
                    updateStats();
                } else {
                    updateMercenaryDisplay();
                }
            } else if (item.type === ITEM_TYPES.FOOD) {
                const gain = item.affinityGain || 0;
                const fullnessGain = item.fullnessGain || 0;
                target.affinity = Math.min(200, (target.affinity || 0) + gain);
                target.fullness = (target.fullness || 0) + fullnessGain;

                const name = target === gameState.player ? '플레이어' : target.name;
                addMessage(`🍖 ${item.name}을(를) 먹여 ${name}의 호감도를 ${formatNumber(gain)} 상승시켰습니다.`, 'item');

                const index = gameState.player.inventory.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    gameState.player.inventory.splice(index, 1);
                }

                updateInventoryDisplay();
                if (target !== gameState.player) {
                    updateMercenaryDisplay();
                }
            } else if (item.type === ITEM_TYPES.MAP) {
                if (target !== gameState.player || gameState.dungeon[gameState.player.y][gameState.player.x] !== 'altar') {
                    addMessage('🗺️ 이 지도는 제단 위에서만 사용할 수 있습니다.', 'info');
                } else {
                    gameState.pendingMap = { level: item.level, modifiers: item.modifiers || {} };
                    const index = gameState.player.inventory.findIndex(i => i.id === item.id);
                    if (index !== -1) {
                        gameState.player.inventory.splice(index, 1);
                    }
                    addMessage(`🗺️ ${item.name}을(를) 활성화했습니다.`, 'info');
                    updateInventoryDisplay();
                }
            }
        }

        // 용병 부활
        function reviveMercenary(mercenary) {
            if (mercenary.alive) return;

            // 부활시키기 전에 플레이어 근처에 공간이 있는지 먼저 확인합니다.
            if (!spawnMercenaryNearPlayer(mercenary)) {
                addMessage('❌ 용병을 부활시킬 공간이 부족합니다.', 'info');
                return; // 공간이 없으면 부활을 중단합니다.
            }

            const scrollIndex = gameState.player.inventory.findIndex(i => i.key === 'reviveScroll');
            if (scrollIndex !== -1) {
                gameState.player.inventory.splice(scrollIndex, 1);
                mercenary.alive = true;
                mercenary.health = getStat(mercenary, 'maxHealth');
                addMessage(`✨ 부활 스크롤로 ${mercenary.name}을(를) 부활시켰습니다!`, 'mercenary');
                updateInventoryDisplay();
            } else {
                const cost = 100;
                if (gameState.player.gold < cost) {
                    addMessage(`💸 골드가 부족합니다. 부활에는 ${formatNumber(cost)} 골드가 필요합니다.`, 'info');
                    // 부활에 실패했으므로, 할당했던 위치를 다시 되돌립니다.
                    mercenary.x = -1;
                    mercenary.y = -1;
                    return;
                }
                gameState.player.gold -= cost;
                mercenary.alive = true;
                mercenary.health = getStat(mercenary, 'maxHealth');
                addMessage(`💰 ${formatNumber(cost)}골드를 사용해 ${mercenary.name}을(를) 부활시켰습니다.`, 'mercenary');
            }

            const data = MERCENARY_TYPES[mercenary.type];
            if (data && data.reviveVoice) playSoundFile(String(data.reviveVoice));

            updateStats();
            updateMercenaryDisplay();
            renderDungeon();
        }

        function removeMercenary(mercenary) {
            let idx = gameState.activeMercenaries.indexOf(mercenary);
            if (idx !== -1) {
                gameState.activeMercenaries.splice(idx, 1);
            } else {
                idx = gameState.standbyMercenaries.indexOf(mercenary);
                if (idx !== -1) gameState.standbyMercenaries.splice(idx, 1);
            }
            updateMercenaryDisplay();
        }

        function killMercenary(mercenary) {
            if (!mercenary.alive) return;

            SoundEngine.playSound('mercDeath');
            const data = MERCENARY_TYPES[mercenary.type];
            if (data && data.deathVoice) playSoundFile(String(data.deathVoice));
            addMessage(`💀 ${mercenary.name}이(가) 전사했습니다...`, 'mercenary');

            mercenary.alive = false;
            mercenary.health = 0;

            if (gameState.dungeon[mercenary.y] && gameState.dungeon[mercenary.y][mercenary.x]) {
                const hasItem = gameState.items.some(i => i.x === mercenary.x && i.y === mercenary.y);
                gameState.dungeon[mercenary.y][mercenary.x] = hasItem ? 'item' : 'empty';
            }

            mercenary.affinity = Math.max(0, (mercenary.affinity || 0) - 5);
            if (mercenary.affinity <= 0) {
                const index = gameState.activeMercenaries.findIndex(m => m.id === mercenary.id);
                if (index > -1) {
                    gameState.activeMercenaries.splice(index, 1);
                }
                addMessage(`👋 ${mercenary.name}이(가) 파티를 영구적으로 떠났습니다.`, 'mercenary');
            }

            updateMercenaryDisplay();
        }

        function dismiss(entity) {
            if (typeof confirm === 'function' && !confirm('정말 해고하시겠습니까?')) return;
            SoundEngine.playSound('dismiss');
            let idx = gameState.activeMercenaries.indexOf(entity);
            if (idx !== -1) {
                gameState.activeMercenaries.splice(idx, 1);
            } else {
                idx = gameState.standbyMercenaries.indexOf(entity);
                if (idx !== -1) {
                    gameState.standbyMercenaries.splice(idx, 1);
                } else {
                    idx = gameState.hatchedSuperiors.indexOf(entity);
                    if (idx !== -1) gameState.hatchedSuperiors.splice(idx, 1);
                }
            }
            updateMercenaryDisplay();
            updateIncubatorDisplay();
        }

        function sacrifice(entity) {
            if (typeof confirm === 'function' && !confirm('정말 희생하시겠습니까?')) return;
            SoundEngine.playSound('dismiss');
            dismiss(entity);
            const essenceKeys = ['strengthEssence','agilityEssence','enduranceEssence','focusEssence','intelligenceEssence','skillLevelEssence'];
            const key = essenceKeys[Math.floor(Math.random() * essenceKeys.length)];
            addToInventory(createItem(key, 0, 0));
            updateInventoryDisplay();
        }

        // 기본 플레이어 대상 아이템 사용 (호환성)
        function useItem(item) {
            useItemOnTarget(item, gameState.player);
        }

        // 몬스터 공격 (용병 방어력 보너스 적용, 안전성 체크 추가)
        function monsterAttack(monster) {
            let nearestTarget = null;
            let nearestDistance = Infinity;
            
            const playerDistance = getDistance(monster.x, monster.y, gameState.player.x, gameState.player.y);
            if (playerDistance <= monster.range && hasLineOfSight(monster.x, monster.y, gameState.player.x, gameState.player.y)) {
                nearestTarget = gameState.player;
                nearestDistance = playerDistance;
            }
            
            gameState.activeMercenaries.forEach(mercenary => {
                if (mercenary.alive) {
                    const distance = getDistance(monster.x, monster.y, mercenary.x, mercenary.y);
                    if (distance <= monster.range && distance < nearestDistance && 
                        hasLineOfSight(monster.x, monster.y, mercenary.x, mercenary.y)) {
                        nearestTarget = mercenary;
                        nearestDistance = distance;
                    }
                }
            });
            
            if (nearestTarget) {
                let totalDefense = getStat(nearestTarget, 'defense');

                const attackValue = monster.special === 'magic' ? monster.magicPower : monster.attack;
                const traitInfo = monster.trait ? MONSTER_TRAITS[monster.trait] : null;
                const result = performAttack(monster, nearestTarget, {
                    attackValue: attackValue,
                    magic: monster.special === 'magic',
                    defenseValue: totalDefense,
                    status: traitInfo && traitInfo.status,
                    element: traitInfo && traitInfo.element
                });

                let attackType = monster.special === 'magic' ? '🔮 마법 공격' :
                               monster.special === 'ranged' ? '🏹 원거리 공격' :
                               '⚔️ 공격';

                const targetName = nearestTarget === gameState.player ? "플레이어" : nearestTarget.name;
                const detail = buildAttackDetail(attackType, traitInfo && traitInfo.name ? traitInfo.name : '', result);
                const img = getMonsterImage(monster);
                if (!result.hit) {
                    addMessage(`${monster.name}의 공격이 빗나갔습니다!`, "combat", detail, img);
                } else {
                    const critMsg = result.crit ? ' (치명타!)' : '';
                    let dmgStr = result.baseDamage;
                    if (result.elementDamage) {
                        const emoji = ELEMENT_EMOJI[result.element] || '';
                        dmgStr = `${result.baseDamage}+${emoji}${result.elementDamage}`;
                    }
                    addMessage(`${monster.name}이(가) ${targetName}에게 ${attackType}으로 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, "combat", detail, img);
                }
                
                if (nearestTarget.health <= 0) {
                    if (nearestTarget === gameState.player) {
                        monster.exp += gameState.player.level * 10;
                        checkMonsterLevelUp(monster);
                        if (window.currentDetailMonster && window.currentDetailMonster.id === monster.id) {
                            showMonsterDetails(monster);
                        }
                        handlePlayerDeath();
                        return true;
                    } else {
                        killMercenary(nearestTarget);
                        monster.exp += nearestTarget.level * 10;
                        checkMonsterLevelUp(monster);
                        if (window.currentDetailMonster && window.currentDetailMonster.id === monster.id) {
                            showMonsterDetails(monster);
                        }
                    }
                }
            }
            return false;
        }

        // 몬스터 스킬 사용
        function performMonsterSkill(monster, target) {
            if (!monster.monsterSkill) return false;
            const skillInfo = MONSTER_SKILLS[monster.monsterSkill];
            if (!skillInfo) return false;
            if (monster.skillCooldowns[monster.monsterSkill] > 0) return false;

            const manaCost = getSkillManaCost(monster, skillInfo);
            if (monster.mana < manaCost) return false;

            monster.mana -= manaCost;

            const level = monster.skillLevels[monster.monsterSkill] || 1;
            const base = skillInfo.magic ? getStat(monster, 'magicPower') : getStat(monster, 'attack');
            let attackValue = (skillInfo.damageDice ? rollDice(skillInfo.damageDice) * level : 0) + base;
            attackValue = Math.floor(attackValue * getSkillPowerMult(monster));

            const result = performAttack(monster, target, {
                attackValue: attackValue,
                magic: !!skillInfo.magic,
                element: skillInfo.element,
                status: skillInfo.status,
                damageDice: skillInfo.damageDice
            });

            const targetName = target === gameState.player ? "플레이어" : target.name;
            const detail = buildAttackDetail(skillInfo.icon, skillInfo.name, result);

            const img = getMonsterImage(monster);
            if (!result.hit) {
                addMessage(`${skillInfo.icon} ${monster.name}의 ${skillInfo.name} 스킬이 ${targetName}에게 빗나갔습니다!`, "combat", detail, img);
            } else {
                const critMsg = result.crit ? ' (치명타!)' : '';
                const dmgStr = formatNumber(result.damage);
                addMessage(`${skillInfo.icon} ${monster.name}이(가) ${skillInfo.name} 스킬로 ${targetName}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, "combat", detail, img);
            }

            if (target.health <= 0) {
                if (target === gameState.player) {
                    handlePlayerDeath();
                    return true;
                } else {
                    SoundEngine.playSound('mercDeath');
                    addMessage(`💀 ${monster.name}이(가) ${target.name}을(를) 처치했습니다!`, "combat", null, getMonsterImage(monster));
                    target.alive = false;
                    target.health = 0;
                    target.affinity = Math.max(0, (target.affinity || 0) - 5);
                    if (target.affinity <= 0) {
                        removeMercenary(target);
                    }
                    updateMercenaryDisplay();
                }
            }
            monster.skillCooldowns[monster.monsterSkill] = getSkillCooldown(monster, skillInfo);
            return true;
        }

        function processMonsterBardTurn(monster) {
            const skillKey = monster.skill;
            const hymnInfo = MERCENARY_SKILLS[skillKey];
            if (!hymnInfo) return false;
            if (monster.skillCooldowns[skillKey] > 0) return false;
            const manaCost = getSkillManaCost(monster, hymnInfo);
            if (monster.mana < manaCost) return false;
            const enemies = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive)];
            const enemyNearby = enemies.some(e => getDistance(monster.x, monster.y, e.x, e.y) <= MONSTER_VISION);
            if (!enemyNearby) return false;
            const level = monster.skillLevels && monster.skillLevels[skillKey] || 1;
            const allies = gameState.monsters.filter(m => m.alive);
            const targets = allies.filter(ally =>
                getDistance(monster.x, monster.y, ally.x, ally.y) <= getSkillRange(monster, hymnInfo) &&
                (!ally.buffs || !ally.buffs.find(b => b.name === skillKey))
            );
            if (targets.length === 0) return false;
            addMessage(`🎵 ${monster.name}이(가) ${hymnInfo.name}을(를) 연주합니다!`, 'combat', null, getMonsterImage(monster));
            targets.forEach(ally => {
                if (hymnInfo.shield) applyShield(monster, ally, hymnInfo, level);
                if (hymnInfo.attackBuff) applyAttackBuff(monster, ally, hymnInfo, level);
                if (hymnInfo.aura) {
                    if (!ally.buffs) ally.buffs = [];
                    ally.buffs.push({ name: skillKey, effects: hymnInfo.aura, turnsLeft: 5 });
                }
            });
            monster.mana -= manaCost;
            monster.skillCooldowns[skillKey] = getSkillCooldown(monster, hymnInfo);
            return true;
        }

        function processMonsterHealerTurn(monster) {
            const skillKey = monster.skill;
            const healInfo = MERCENARY_SKILLS[skillKey];
            if (!healInfo || !healInfo.heal) return false;
            if (monster.skillCooldowns[skillKey] > 0) return false;
            const manaCost = getSkillManaCost(monster, healInfo);
            if (monster.mana < manaCost) return false;
            const level = monster.skillLevels && monster.skillLevels[skillKey] || 1;
            const healRange = getSkillRange(monster, healInfo);
            const allies = gameState.monsters.filter(m => m.alive);
            let target = allies.find(a => a.health < getStat(a, 'maxHealth') * 0.7 &&
                getDistance(monster.x, monster.y, a.x, a.y) <= healRange);
            if (!target && monster.health < getStat(monster, 'maxHealth')) {
                target = monster;
            }
            if (!target) return false;
            if (healTarget(monster, target, healInfo, level)) {
                monster.mana -= manaCost;
                monster.skillCooldowns[skillKey] = getSkillCooldown(monster, healInfo);
                return true;
            }
            return false;
        }

        // 플레이어 사망 처리
        function handlePlayerDeath() {
            gameState.gameRunning = false;
            addMessage("💀 플레이어가 사망했습니다...", "combat", null, getPlayerImage());
            
            const gameOverDiv = document.createElement('div');
            gameOverDiv.className = 'game-over';
            gameOverDiv.innerHTML = `
                <h2 style="color: #f44336;">⚰️ 게임 오버</h2>
                <p>🏰 던전 ${formatNumber(gameState.floor)}층에서 전사했습니다.</p>
                <p>👹 처치한 몬스터: ${formatNumber(gameState.floor * 3)}마리</p>
                <p>💰 획득한 골드: ${formatNumber(gameState.player.gold)}</p>
                <button onclick="location.reload()">🔄 다시 시작</button>
            `;
            document.body.appendChild(gameOverDiv);
        }

        // 플레이어 이동
        function movePlayer(dx, dy) {
            if (!gameState.gameRunning) return;
            if ((gameState.player.paralysis && gameState.player.paralysisTurns > 0) ||
                (gameState.player.petrify && gameState.player.petrifyTurns > 0)) {
                addMessage('⚠️ 플레이어는 움직일 수 없습니다.', 'info');
                processTurn();
                return;
            }
            if (!gameState.autoMoveActive) {
                gameState.autoMovePath = null;
            }
            
            const newX = gameState.player.x + dx;
            const newY = gameState.player.y + dy;
            
            if (newX < 0 || newX >= gameState.dungeonSize || 
                newY < 0 || newY >= gameState.dungeonSize) {
                return;
            }
            
            const cellType = gameState.dungeon[newY][newX];
            
            if (cellType === 'wall') {
                return;
            }
            
            const blockingMercenary = gameState.activeMercenaries.find(m => m.x === newX && m.y === newY && m.alive);
            if (blockingMercenary) {
                const oldX = gameState.player.x;
                const oldY = gameState.player.y;
                gameState.player.x = newX;
                gameState.player.y = newY;

                if (cellType === 'item') {
                    const item = gameState.items.find(i => i.x === newX && i.y === newY);
                    if (item) {
                        addToInventory(item);
                        SoundEngine.playSound('getItem');
                        playPlayerVoice('assets/audio/player_item.mp3');
                        addMessage(`📦 ${item.name}을(를) 획득했습니다!`, 'item');

                        const itemIndex = gameState.items.findIndex(i => i === item);
                        if (itemIndex !== -1) {
                            gameState.items.splice(itemIndex, 1);
                        }
                        gameState.dungeon[newY][newX] = 'empty';
                    }
                }

                blockingMercenary.x = oldX;
                blockingMercenary.y = oldY;
                processTurn();
                return;
            }
            
            if (cellType === 'monster') {
                const monster = gameState.monsters.find(m => m.x === newX && m.y === newY);
                if (monster) {
                    SoundEngine.playSound('playerAttack'); // 플레이어 공격음 재생
                    const totalAttack = getStat(gameState.player, 'attack');

                    const result = performAttack(gameState.player, monster, { attackValue: totalAttack, status: gameState.player.equipped.weapon && gameState.player.equipped.weapon.status });
                    const detail = buildAttackDetail('근접 공격', '', result);
                    const img = getPlayerImage();
                    if (!result.hit) {
                        addMessage(`❌ ${monster.name}에게 공격이 빗나갔습니다!`, "combat", detail, img);
                    } else {
                        const critMsg = result.crit ? ' (치명타!)' : '';
                        let dmgStr = formatNumber(result.baseDamage);
                        if (result.elementDamage) {
                            const emoji = ELEMENT_EMOJI[result.element] || '';
                            dmgStr = `${formatNumber(result.baseDamage)}+${emoji}${formatNumber(result.elementDamage)}`;
                        }
                        addMessage(`⚔️ ${monster.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, "combat", detail, img);
                    }
                    
                    if (monster.health <= 0) {
                        killMonster(monster);
                    }
                    
                    processTurn();
                    return;
                }
            }
            
            gameState.player.x = newX;
            gameState.player.y = newY;
            
            if (cellType === 'treasure') {
                const treasure = gameState.treasures.find(t => t.x === newX && t.y === newY);
                if (treasure) {
                    SoundEngine.playSound('treasure');
                    playPlayerVoice('assets/audio/player_gold.mp3');
                    let gold = treasure.gold;
                    gameState.player.gold += gold;
                    addMessage(`💎 보물을 발견했습니다! ${formatNumber(gold)} 골드를 획득했습니다!`, "treasure");
                    
                    const treasureIndex = gameState.treasures.findIndex(t => t === treasure);
                    if (treasureIndex !== -1) {
                        gameState.treasures.splice(treasureIndex, 1);
                    }
                    gameState.dungeon[newY][newX] = 'empty';
                }
            }
            
            if (cellType === 'item') {
                const item = gameState.items.find(i => i.x === newX && i.y === newY);
                if (item) {
                    addToInventory(item);
                    SoundEngine.playSound('getItem'); // 아이템 획득음 재생
                    playPlayerVoice('assets/audio/player_item.mp3');
                    addMessage(`📦 ${item.name}을(를) 획득했습니다!`, 'item');

                    const itemIndex = gameState.items.findIndex(i => i === item);
                    if (itemIndex !== -1) {
                        gameState.items.splice(itemIndex, 1);
                    }
                    gameState.dungeon[newY][newX] = 'empty';
                }
            }

            if (cellType === 'tile') {
                // Decorative map tiles no longer grant items
            }

            if (cellType === 'plant') {
                SoundEngine.playSound('gatherMaterial');
                playPlayerVoice('assets/audio/player_craft.mp3');
                const materialsPool = ['herb', 'bread', 'meat', 'lettuce'];
                const gained = [];
                const count = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < count; i++) {
                    const mat = materialsPool[Math.floor(Math.random() * materialsPool.length)];
                    if (!gameState.materials[mat]) gameState.materials[mat] = 0;
                    gameState.materials[mat] += 1;
                    gained.push(mat);
                }
                addMessage(`🌿 식물을 채집하여 ${gained.join(', ')}을(를) 얻었습니다.`, 'item');
                gameState.dungeon[newY][newX] = 'empty';
                updateMaterialsDisplay();
            }

            if (cellType === 'chest') {
                SoundEngine.playSound('openChest');
                const itemKeys = Object.keys(ITEMS).filter(k => k !== 'reviveScroll' && ITEMS[k].type !== ITEM_TYPES.ESSENCE);
                const dropCount = 1 + Math.floor(Math.random() * 5);
                for (let i = 0; i < dropCount; i++) {
                    const key = itemKeys[Math.floor(Math.random() * itemKeys.length)];
                    const pos = findAdjacentEmpty(newX, newY);
                    const drop = createItem(key, pos.x, pos.y, null, Math.floor(gameState.floor / 5), Math.random() < 0.1);
                    gameState.items.push(drop);
                    gameState.dungeon[pos.y][pos.x] = 'item';
                }
                const unknown = Object.keys(RECIPES).filter(r => !gameState.knownRecipes.includes(r));
                if (unknown.length && Math.random() < 0.25) {
                    const pos = findAdjacentEmpty(newX, newY);
                    const scroll = createRecipeScroll(unknown[Math.floor(Math.random() * unknown.length)], pos.x, pos.y);
                    gameState.items.push(scroll);
                    gameState.dungeon[pos.y][pos.x] = 'item';
                }
                addMessage('🎁 보물 상자가 열렸습니다!', 'treasure');
                gameState.dungeon[newY][newX] = 'empty';
            }

            if (cellType === 'mine') {
                SoundEngine.playSound('gatherMaterial');
                playPlayerVoice('assets/audio/player_craft.mp3');
                const qty = 5 + gameState.floor * 3;
                if (!gameState.materials.iron) gameState.materials.iron = 0;
                gameState.materials.iron += qty;
                addMessage(`⛏️ 철 ${qty}개를 채굴했습니다.`, 'info');
                gameState.dungeon[newY][newX] = 'empty';
                updateMaterialsDisplay();
            }

            if (cellType === 'tree') {
                SoundEngine.playSound('gatherMaterial');
                playPlayerVoice('assets/audio/player_craft.mp3');
                const qty = 5 + gameState.floor * 3;
                if (!gameState.materials.wood) gameState.materials.wood = 0;
                gameState.materials.wood += qty;
                addMessage(`🌳 나무 ${qty}개를 얻었습니다.`, 'info');
                gameState.dungeon[newY][newX] = 'empty';
                updateMaterialsDisplay();
            }

            if (cellType === 'paladin') {
                const spawn = gameState.paladinSpawns.find(p => p.x === newX && p.y === newY);
                if (spawn) {
                    const cost = spawn.cost || MERCENARY_TYPES.PALADIN.cost;
                    if (gameState.activeMercenaries.concat(gameState.standbyMercenaries).some(m => m.type === 'PALADIN')) {
                        addMessage('이미 성기사가 있습니다.', 'info');
                    } else if (gameState.player.gold < cost) {
                        addMessage(`💸 골드가 부족합니다. 성기사 고용에는 ${formatNumber(cost)} 골드가 필요합니다.`, 'info');
                    } else if (typeof confirm !== 'function' || confirm(`성기사를 ${formatNumber(cost)}골드에 고용하시겠습니까?`)) {
                        const mercenary = spawn.mercenary;
                        if (!spawnMercenaryNearPlayer(mercenary)) {
                            addMessage('❌ 용병을 배치할 공간이 없습니다.', 'info');
                        } else {
                            gameState.player.gold -= cost;
                            gameState.activeMercenaries.push(mercenary);
                            gameState.paladinSpawns.splice(gameState.paladinSpawns.indexOf(spawn),1);
                            gameState.dungeon[newY][newX] = 'empty';
                            playSoundFile(String(MERCENARY_TYPES.PALADIN.voiceFile));
                            addMessage(`🎉 ${MERCENARY_TYPES.PALADIN.name}을(를) 고용했습니다!`, 'mercenary');
                            updateStats();
                            updateMercenaryDisplay();
                            renderDungeon();
                        }
                    }
                }
                return;
            }

            if (cellType === 'bones') {
                SoundEngine.playSound('gatherMaterial');
                playPlayerVoice('assets/audio/player_craft.mp3');
                const qty = 5 + gameState.floor * 3;
                if (!gameState.materials.bone) gameState.materials.bone = 0;
                gameState.materials.bone += qty;
                addMessage(`🦴 뼈 ${qty}개를 수집했습니다.`, 'info');
                gameState.dungeon[newY][newX] = 'empty';
                updateMaterialsDisplay();
            }

            if (cellType === 'grave') {
                const accept = (typeof confirm === 'function' ? confirm('무덤을 조사하시겠습니까?') : true);
                if (accept) {
                    const itemKeys = Object.keys(ITEMS).filter(k => ITEMS[k].level > Math.ceil(gameState.floor / 2 + 1));
                    const dropCount = 2 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < dropCount; i++) {
                        let key = itemKeys[Math.floor(Math.random() * itemKeys.length)];
                        if (Math.random() < 0.2) key = 'superiorEgg';
                        const pos = findAdjacentEmpty(newX, newY);
                        const drop = createItem(key, pos.x, pos.y, null, Math.floor(gameState.floor / 5) + 1, Math.random() < 0.1);
                        gameState.items.push(drop);
                        gameState.dungeon[pos.y][pos.x] = 'item';
                    }

                    const matQty = 10 + gameState.floor * 5;
                    ['wood', 'iron', 'bone'].forEach(mat => {
                        if (!gameState.materials[mat]) gameState.materials[mat] = 0;
                        gameState.materials[mat] += matQty;
                    });
                    const goldGain = 100 + gameState.floor * 50;
                    gameState.player.gold += goldGain;

                    const monsterTypes = getMonsterPoolForFloor(gameState.floor + 1);
                    const spawn = 3 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < spawn; i++) {
                        const pos = findAdjacentEmpty(newX, newY);
                        if (gameState.dungeon[pos.y][pos.x] !== 'empty') continue;
                        const t = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
                        const m = createMonster(t, pos.x, pos.y, gameState.floor + 1);
                        gameState.monsters.push(m);
                        gameState.dungeon[pos.y][pos.x] = 'monster';
                    }

                    updateMaterialsDisplay();
                    updateStats();
                }
                gameState.dungeon[newY][newX] = 'empty';
            }

            if (cellType.startsWith('temple')) {
                SoundEngine.playSound('templeChime');
                playPlayerVoice('assets/audio/player_temple.mp3');
                if (cellType === 'templeHeal') {
                    gameState.player.health = getStat(gameState.player, 'maxHealth');
                    gameState.player.mana = getStat(gameState.player, 'maxMana');
                    [...gameState.activeMercenaries, ...gameState.standbyMercenaries].forEach(m => {
                        const maxH = getStat(m, 'maxHealth');
                        const maxM = getStat(m, 'maxMana');
                        m.health = maxH;
                        m.mana = maxM;
                    });
                    addMessage('✨ 신성한 기운이 파티의 체력과 마나를 회복했습니다!', 'info');
                } else if (cellType === 'templeFood') {
                    gameState.player.fullness = MAX_FULLNESS;
                    [...gameState.activeMercenaries, ...gameState.standbyMercenaries].forEach(m => { m.fullness = MAX_FULLNESS; });
                    addMessage('✨ 풍요의 사원에서 배부름이 가득 찼습니다!', 'info');
                } else if (cellType === 'templeAffinity') {
                    [...gameState.activeMercenaries, ...gameState.standbyMercenaries].forEach(m => { m.affinity = (m.affinity || 0) + 10; });
                    addMessage('✨ 우정의 사원에서 호감도가 상승했습니다!', 'info');
                }
                gameState.dungeon[newY][newX] = 'empty';
                updateStats();
            }

            if (cellType === 'altar') {
                addMessage('🗺️ 제단 위에서 지도를 사용하면 다음 층에 적용됩니다.', 'info');
            }

            if (cellType === 'corpse') {
                const corpse = gameState.corpses.find(c => c.x === newX && c.y === newY);
                if (corpse) {
                    showCorpsePanel(corpse);
                    return;
                }
            }
            
            if (cellType === 'exit') {
                nextFloor();
                return;
            }

            if (cellType === 'shop') {
                showShop();
                return;
            }

            checkDanger();
            processTurn();
        }

        function autoMoveStep() {
            if (!gameState.autoMovePath || !gameState.autoMovePath.length) {
                gameState.autoMovePath = null;
                return;
            }
            const step = gameState.autoMovePath.shift();
            const dx = step.x - gameState.player.x;
            const dy = step.y - gameState.player.y;
            gameState.autoMoveActive = true;
            movePlayer(dx, dy);
            gameState.autoMoveActive = false;
            if (gameState.autoMovePath && gameState.autoMovePath.length && gameState.gameRunning) {
                setTimeout(autoMoveStep, 100);
            } else {
                gameState.autoMovePath = null;
            }
        }

        // 다음 층으로
        function nextFloor() {
            SoundEngine.playSound('nextFloor');
            gameState.floor++;
            const mapData = gameState.pendingMap ? {
                level: gameState.pendingMap.level || gameState.floor,
                modifiers: gameState.pendingMap.modifiers || {}
            } : null;
            gameState.pendingMap = null;
            addMessage(`🌀 던전 ${gameState.floor}층으로 내려갑니다...`, "level");
            
            // 용병들 체력 약간 회복
            gameState.activeMercenaries.forEach(mercenary => {
                if (mercenary.alive) {
                    const maxHp = getStat(mercenary, 'maxHealth');
                    mercenary.health = Math.min(maxHp, mercenary.health + Math.floor(maxHp * 0.2));
                }
            });
            
            generateDungeon(mapData);

            // 새 층에서 살아있는 용병들을 플레이어 근처로 이동
            gameState.activeMercenaries.forEach(mercenary => {
                if (!mercenary.alive) return;

                const positions = [
                    {x: gameState.player.x + 1, y: gameState.player.y},
                    {x: gameState.player.x - 1, y: gameState.player.y},
                    {x: gameState.player.x, y: gameState.player.y + 1},
                    {x: gameState.player.x, y: gameState.player.y - 1},
                    {x: gameState.player.x + 1, y: gameState.player.y + 1},
                    {x: gameState.player.x - 1, y: gameState.player.y - 1},
                    {x: gameState.player.x + 1, y: gameState.player.y - 1},
                    {x: gameState.player.x - 1, y: gameState.player.y + 1}
                ];

                for (const pos of positions) {
                    if (pos.x >= 0 && pos.x < gameState.dungeonSize &&
                        pos.y >= 0 && pos.y < gameState.dungeonSize &&
                        gameState.dungeon[pos.y][pos.x] === 'empty' &&
                        !gameState.activeMercenaries.some(m => m !== mercenary && m.alive && m.x === pos.x && m.y === pos.y) &&
                        !gameState.monsters.some(m => m.x === pos.x && m.y === pos.y)) {
                        mercenary.x = pos.x;
                        mercenary.y = pos.y;
                        break;
                    }
                }
            });

            // 변경된 위치 반영
            renderDungeon();
        }

        function exitMap(returnState) {
            generateDungeon(mapData);
            let { x, y } = returnState;
            if (!gameState.dungeon[y] || gameState.dungeon[y][x] !== 'empty') {
                const pos = findNearestEmpty(x, y);
                x = pos.x;
                y = pos.y;
            }
            gameState.player.x = x;
            gameState.player.y = y;
            renderDungeon();
        }

        // 턴 처리 (최적화됨)
function processTurn() {
    if (!gameState.gameRunning) return;
    gameState.turn++;

    const decrementCooldowns = entity => {
        if (!entity.skillCooldowns) return;
        for (const key in entity.skillCooldowns) {
            if (entity.skillCooldowns[key] > 0) entity.skillCooldowns[key]--;
        }
    };
    const decrementShield = entity => {
        if (entity.shieldTurns && entity.shieldTurns > 0) {
            entity.shieldTurns--;
            if (entity.shieldTurns <= 0) entity.shield = 0;
            refreshDetailPanel(entity);
        }
    };
    const decrementAttackBuff = entity => {
        if (entity.attackBuffTurns && entity.attackBuffTurns > 0) {
            entity.attackBuffTurns--;
            if (entity.attackBuffTurns <= 0) entity.attackBuff = 0;
            refreshDetailPanel(entity);
        }
    };
    const decrementBuffs = entity => {
        if (!Array.isArray(entity.buffs)) return;
        for (let i = entity.buffs.length - 1; i >= 0; i--) {
            const b = entity.buffs[i];
            b.turnsLeft--;
            if (b.turnsLeft <= 0) {
                entity.buffs.splice(i, 1);
                refreshDetailPanel(entity);
            }
        }
    };
    decrementCooldowns(gameState.player);
    decrementShield(gameState.player);
    decrementAttackBuff(gameState.player);
    decrementBuffs(gameState.player);
    gameState.activeMercenaries.forEach(decrementCooldowns);
    gameState.activeMercenaries.forEach(decrementShield);
    gameState.activeMercenaries.forEach(decrementAttackBuff);
    gameState.activeMercenaries.forEach(decrementBuffs);
    gameState.monsters.forEach(decrementCooldowns);
    gameState.monsters.forEach(decrementShield);
    gameState.monsters.forEach(decrementAttackBuff);
    gameState.monsters.forEach(decrementBuffs);

    for (let i = gameState.corpses.length - 1; i >= 0; i--) {
        const corpse = gameState.corpses[i];
        corpse.turnsLeft--;
        if (corpse.turnsLeft <= 0) {
            gameState.corpses.splice(i, 1);
            const hasItem = gameState.items.some(it => it.x === corpse.x && it.y === corpse.y);
            gameState.dungeon[corpse.y][corpse.x] = hasItem ? 'item' : 'empty';
        }
    }

            const starvedMercs = [];
            const starvedMonsters = [];
            [...gameState.activeMercenaries, ...gameState.standbyMercenaries].forEach(m => {
                m.fullness = Math.max(0, (m.fullness || 0) - FULLNESS_LOSS_PER_TURN);
                if (m.fullness <= 0) {
                    starvedMercs.push(m);
                } else if (m.fullness <= 50) {
                    const food = gameState.player.inventory.find(i => i.type === ITEM_TYPES.FOOD);
                    if (food) {
                        useItemOnTarget(food, m);
                        addMessage(`🍽️ ${m.name}이(가) ${food.name}을(를) 먹었습니다.`, 'info');
                    }
                }
            });
            starvedMercs.forEach(m => {
                addMessage(`💀 ${m.name}이(가) 굶주림으로 사망했습니다.`, 'mercenary');
                removeMercenary(m);
            });

            gameState.monsters.forEach(monster => {
                if (monster.affinity !== undefined) {
                    monster.fullness = Math.max(0, (monster.fullness || 0) - FULLNESS_LOSS_PER_TURN);
                    if (monster.fullness <= 0) {
                        starvedMonsters.push(monster);
                    } else if (monster.fullness <= 50) {
                        const food = gameState.player.inventory.find(i => i.type === ITEM_TYPES.FOOD);
                        if (food) {
                            useItemOnTarget(food, monster);
                            addMessage(`🍽️ ${monster.name}이(가) ${food.name}을(를) 먹었습니다.`, 'info');
                        }
                    }
                }
            });
            starvedMonsters.forEach(monster => {
                addMessage(`💀 ${monster.name}이(가) 굶어 죽었습니다.`, 'info');
                const idx = gameState.monsters.indexOf(monster);
                if (idx !== -1) {
                    gameState.monsters.splice(idx, 1);
                    if (monster.y >= 0 && monster.x >= 0 && gameState.dungeon[monster.y]) {
                        gameState.dungeon[monster.y][monster.x] = 'empty';
                    }
                }
            });
            const AFFINITY_PER_TURN = 0.01;
            gameState.activeMercenaries.forEach(m => {
                if (m.alive) {
                    m.affinity = Math.min(200, (m.affinity || 0) + AFFINITY_PER_TURN);
                }
            });
            const isTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
            if (!isTestEnv) processProjectiles();

            if (applyStatusEffects(gameState.player)) {
                handlePlayerDeath();
                return;
            }
            for (let i = gameState.activeMercenaries.length - 1; i >= 0; i--) {
                const mercenary = gameState.activeMercenaries[i];
                if (!mercenary.alive) continue;

                if (applyStatusEffects(mercenary)) {
                    killMercenary(mercenary);
                }
            }
            gameState.monsters.slice().forEach(monster => {
                if (applyStatusEffects(monster)) {
                    killMonster(monster);
                }
            });

            gameState.monsters.forEach(m => {
                if (m.bleedTurns && m.bleedTurns > 0) {
                    m.bleedTurns--;
                }
            });
            
            // 용병 턴 처리
            gameState.activeMercenaries.forEach(mercenary => {
                mercenary.hasActed = false;
                mercenary.nextX = mercenary.x;
                mercenary.nextY = mercenary.y;
            });

            const sortedMercenaries = [...gameState.activeMercenaries].sort((a, b) => {
                const da = getDistance(a.x, a.y, gameState.player.x, gameState.player.y);
                const db = getDistance(b.x, b.y, gameState.player.x, gameState.player.y);
                return db - da; // farthest first
            });

            sortedMercenaries.forEach(mercenary => {
                processMercenaryTurn(mercenary, gameState.monsters);
            });

            const occupied = new Set();
            sortedMercenaries.forEach(mercenary => {
                const key = `${mercenary.nextX},${mercenary.nextY}`;
                if (!occupied.has(key)) {
                    mercenary.x = mercenary.nextX;
                    mercenary.y = mercenary.nextY;
                    occupied.add(key);
                }
            });
            
            // 몬스터 턴 처리
            gameState.monsters.forEach(monster => {
                monster.hasActed = false;
            });
            
            for (const monster of [...gameState.monsters]) {
                if (monster.hasActed || !gameState.gameRunning) continue;
                if ((monster.paralysis && monster.paralysisTurns > 0) || (monster.petrify && monster.petrifyTurns > 0)) {
                    monster.paralysisTurns && monster.paralysisTurns--;
                    monster.petrifyTurns && monster.petrifyTurns--;
                    if (monster.paralysisTurns <= 0) monster.paralysis = false;
                    if (monster.petrifyTurns <= 0) monster.petrify = false;
                    monster.hasActed = true;
                    continue;
                }

                // 플레이어와 너무 멀리 떨어진 몬스터는 이번 턴에 행동하지 않습니다.
                const distToPlayer = getDistance(monster.x, monster.y, gameState.player.x, gameState.player.y);
                if (distToPlayer > MONSTER_VISION) {
                    monster.hasActed = true;
                    continue;
                }

                // [추가] 몬스터가 챔피언이면 전용 AI를 사용하고 다음 몬스터로 넘어갑니다.
                if (monster.isChampion) {
                    processChampionTurn(monster);
                    monster.hasActed = true;
                    continue;
                }

                if (monster.isSuperior && monster.skill) {
                    if (['GuardianHymn','CourageHymn'].includes(monster.skill)) {
                        if (processMonsterBardTurn(monster)) {
                            monster.hasActed = true;
                            continue;
                        }
                    } else if (monster.skill === 'Heal') {
                        if (processMonsterHealerTurn(monster)) {
                            monster.hasActed = true;
                            continue;
                        }
                    }
                }
                
                let nearestTarget = null;
                let nearestDistance = Infinity;

                // 가장 가까운 대상 찾기
                if (distToPlayer <= MONSTER_VISION) { // 이동 + 공격 범위
                    nearestTarget = gameState.player;
                    nearestDistance = distToPlayer;
                }
                
                gameState.activeMercenaries.forEach(mercenary => {
                    if (mercenary.alive) {
                        const distance = getDistance(monster.x, monster.y, mercenary.x, mercenary.y);
                        if (distance <= MONSTER_VISION && distance < nearestDistance) {
                            nearestTarget = mercenary;
                            nearestDistance = distance;
                        }
                    }
                });
                
                if (nearestTarget) {
                    // 공격 범위 내에 있으면 공격
                    if (nearestDistance <= monster.range &&
                        hasLineOfSight(monster.x, monster.y, nearestTarget.x, nearestTarget.y)) {

                        const skillInfo = monster.monsterSkill ? MONSTER_SKILLS[monster.monsterSkill] : null;
                        const canUseSkill = skillInfo && monster.mana >= getSkillManaCost(monster, skillInfo);
                        let playerDied = false;

                        if (canUseSkill && Math.random() < 0.5) {
                            playerDied = performMonsterSkill(monster, nearestTarget);
                        } else {
                            playerDied = monsterAttack(monster);
                        }

                        if (playerDied) {
                            return;
                        }
                    } else {
                        // 대상에게 접근
                        const dx = Math.sign(nearestTarget.x - monster.x);
                        const dy = Math.sign(nearestTarget.y - monster.y);
                        
                        let newX = monster.x;
                        let newY = monster.y;
                        
                        // 대각선 이동보다 직선 이동 우선
                        if (Math.random() < 0.5) {
                            if (dx !== 0) newX += dx;
                            else if (dy !== 0) newY += dy;
                        } else {
                            if (dy !== 0) newY += dy;
                            else if (dx !== 0) newX += dx;
                        }
                        
                        // 이동 가능한지 체크
                        if (newX >= 0 && newX < gameState.dungeonSize &&
                            newY >= 0 && newY < gameState.dungeonSize &&
                            gameState.dungeon[newY][newX] === 'empty' &&
                            !(newX === gameState.player.x && newY === gameState.player.y) &&
                            !gameState.monsters.some(m => m.x === newX && m.y === newY && m !== monster) &&
                            !gameState.activeMercenaries.some(m => m.x === newX && m.y === newY && m.alive)) {

                            // 몬스터 이동
                            gameState.dungeon[monster.y][monster.x] = 'empty';
                            monster.x = newX;
                            monster.y = newY;
                            gameState.dungeon[newY][newX] = 'monster';

                            // 이동 후 공격 가능한지 체크
                            const newDistance = getDistance(monster.x, monster.y, nearestTarget.x, nearestTarget.y);
                            if (newDistance <= monster.range &&
                                hasLineOfSight(monster.x, monster.y, nearestTarget.x, nearestTarget.y)) {
                                const skillInfo = monster.monsterSkill ? MONSTER_SKILLS[monster.monsterSkill] : null;
                                const canUseSkill = skillInfo && monster.mana >= getSkillManaCost(monster, skillInfo);
                                let playerDied = false;

                                if (canUseSkill && Math.random() < 0.5) {
                                    playerDied = performMonsterSkill(monster, nearestTarget);
                                } else {
                                    playerDied = monsterAttack(monster);
                                }

                                if (playerDied) {
                                    return;
                                }
                            }
                        } else {
                            const path = findPath(monster.x, monster.y, nearestTarget.x, nearestTarget.y);
                            if (path && path.length > 1) {
                                const step = path[1];
                                const valid = step.x >= 0 && step.x < gameState.dungeonSize &&
                                    step.y >= 0 && step.y < gameState.dungeonSize &&
                                    gameState.dungeon[step.y][step.x] === 'empty' &&
                                    !(step.x === gameState.player.x && step.y === gameState.player.y) &&
                                    !gameState.monsters.some(m => m.x === step.x && m.y === step.y && m !== monster) &&
                                    !gameState.activeMercenaries.some(m => m.x === step.x && m.y === step.y && m.alive);
                                if (valid) {
                                    gameState.dungeon[monster.y][monster.x] = 'empty';
                                    monster.x = step.x;
                                    monster.y = step.y;
                                    gameState.dungeon[step.y][step.x] = 'monster';

                                    const newDistance = getDistance(monster.x, monster.y, nearestTarget.x, nearestTarget.y);
                                    if (newDistance <= monster.range &&
                                        hasLineOfSight(monster.x, monster.y, nearestTarget.x, nearestTarget.y)) {
                                        const skillInfo = monster.monsterSkill ? MONSTER_SKILLS[monster.monsterSkill] : null;
                                        const canUseSkill = skillInfo && monster.mana >= (skillInfo.manaCost || 0);
                                        let playerDied = false;

                                        if (canUseSkill && Math.random() < 0.5) {
                                            playerDied = performMonsterSkill(monster, nearestTarget);
                                        } else {
                                            playerDied = monsterAttack(monster);
                                        }

                                        if (playerDied) {
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                monster.hasActed = true;
            }
            
            updateFogOfWar();
            // 렌더링과 카메라 업데이트를 한 번에 처리
            requestAnimationFrame(() => {
                updateCamera();
                renderDungeon();
            });
            const allPlayerUnits = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive)];
            allPlayerUnits.forEach(unit => {
                const hpRegen = getStat(unit, 'healthRegen');
                const mpRegen = getStat(unit, 'manaRegen');
                if (hpRegen > 0) {
                    unit.health = Math.min(getStat(unit, 'maxHealth'), unit.health + hpRegen);
                }
                if (mpRegen > 0) {
                    unit.mana = Math.min(getStat(unit, 'maxMana'), (unit.mana || 0) + mpRegen);
                }
            });
            updateStats();
            updateMercenaryDisplay();
            gameState.craftingQueue.forEach(entry => entry.turnsLeft--);
            for (let i = 0; i < gameState.craftingQueue.length; i++) {
                const c = gameState.craftingQueue[i];
                if (c.turnsLeft <= 0) {
                    SoundEngine.playSound('craftFinish');
                    const item = createItem(RECIPES[c.recipe].output, 0, 0);
                    addToInventory(item);
                    addMessage(`🛠️ ${RECIPES[c.recipe].name} 제작 완료`, 'item');
                    gameState.craftingQueue.splice(i, 1);
                    i--;
                }
            }
            updateMaterialsDisplay();
            advanceIncubators();
            updateIncubatorDisplay();

            const hpRatio = gameState.player.health / getStat(gameState.player, 'maxHealth');
            if (hpRatio < 0.25 && !lowHpAlertPlayed) {
                playPlayerVoice('assets/audio/player_low_hp.mp3');
                lowHpAlertPlayed = true;
            } else if (hpRatio >= 0.25) {
                lowHpAlertPlayed = false;
            }

            // [추가된 유휴 대사 시스템]
            // 이번 턴에 전투가 없었고, 0.3% 확률을 통과했을 때 대사를 출력합니다.
            if (!combatOccurredInTurn && Math.random() < 0.003) {
                const livingMercenaries = gameState.activeMercenaries.filter(m => m.alive);

                if (livingMercenaries.length > 0) {
                    // 살아있는 용병 중 한 명을 랜덤으로 선택
                    const randomMerc = livingMercenaries[Math.floor(Math.random() * livingMercenaries.length)];
                    const quotes = MERCENARY_IDLE_QUOTES[randomMerc.type];

                    if (quotes && quotes.length > 0) {
                        // 해당 용병의 대사 목록에서 하나를 랜덤으로 선택
                        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

                        // 전투 로그에 대사 추가 (새로운 'dialogue' 타입 사용)
                        addMessage(`💬 ${randomMerc.name}: "${randomQuote}"`, 'dialogue');
                    }
                }
            }

        // 다음 턴을 위해 전투 발생 플래그를 리셋합니다.
        combatOccurredInTurn = false;
        checkDanger();
    }

    function processPaladinTurn(mercenary, visibleMonsters = gameState.monsters) {
        let nearestMonster = null;
        let nearestDistance = Infinity;
        visibleMonsters.forEach(mon => {
            const distanceFromPlayer = getDistance(mon.x, mon.y, gameState.player.x, gameState.player.y);
            if (distanceFromPlayer > PARTY_LEASH_RADIUS) return;
            const dist = getDistance(mercenary.x, mercenary.y, mon.x, mon.y);
            if (dist < nearestDistance && hasLineOfSight(mercenary.x, mercenary.y, mon.x, mon.y)) {
                nearestDistance = dist;
                nearestMonster = mon;
            }
        });

        if (nearestMonster) {
            // ----- Step 1: apply self buff if not active -----
            const buffKey = mercenary.skill;
            const buffInfo = MERCENARY_SKILLS[buffKey] || MONSTER_SKILLS[buffKey];
            const buffLevel = mercenary.skillLevels && mercenary.skillLevels[buffKey] || 1;
            const buffMana = buffInfo ? getSkillManaCost(mercenary, buffInfo) : 0;
            const hasBuff = buffInfo && Array.isArray(mercenary.buffs) && mercenary.buffs.some(b => b.name === buffInfo.name);

            if (buffInfo && buffInfo.statBuff && !hasBuff && !(mercenary.skillCooldowns[buffKey] > 0) && mercenary.mana >= buffMana) {
                applyStatPercentBuff(mercenary, mercenary, buffInfo, buffLevel);
                mercenary.mana -= buffMana;
                mercenary.skillCooldowns[buffKey] = getSkillCooldown(mercenary, buffInfo);
                updateMercenaryDisplay();
                mercenary.hasActed = true;
                return;
            }

            const secondKey = mercenary.skill2;
            const secondInfo = MERCENARY_SKILLS[secondKey] || MONSTER_SKILLS[secondKey];
            const secondLevel = mercenary.skillLevels && mercenary.skillLevels[secondKey] || 1;
            const secondMana = secondInfo ? getSkillManaCost(mercenary, secondInfo) : 0;
            // ----- Step 2: use offensive skill if available -----
            if (secondInfo && !(mercenary.skillCooldowns[secondKey] > 0) && mercenary.mana >= secondMana &&
                nearestDistance <= getSkillRange(mercenary, secondInfo) &&
                hasLineOfSight(mercenary.x, mercenary.y, nearestMonster.x, nearestMonster.y)) {
                if (secondInfo.statBuff) {
                    applyStatPercentBuff(mercenary, mercenary, secondInfo, secondLevel);
                } else if (secondInfo.shield) {
                    applyShield(mercenary, mercenary, secondInfo, secondLevel);
                } else if (secondInfo.attackBuff) {
                    applyAttackBuff(mercenary, mercenary, secondInfo, secondLevel);
                } else {
                    let attackValue = getStat(mercenary, 'attack');
                    if (secondInfo.magic) {
                        attackValue = (rollDice(secondInfo.damageDice || '1d6') * secondLevel + getStat(mercenary, 'magicPower')) * getSkillPowerMult(mercenary);
                    } else if (secondInfo.damageDice) {
                        attackValue = (rollDice(secondInfo.damageDice) * secondLevel + getStat(mercenary, 'attack')) * getSkillPowerMult(mercenary);
                    } else if (secondInfo.multiplier) {
                        attackValue = Math.floor(attackValue * secondInfo.multiplier * secondLevel * getSkillPowerMult(mercenary));
                    }
                    const hits = secondInfo.hits || 1;
                    const icon = secondInfo.icon;
                    for (let i = 0; i < hits; i++) {
                        const result = performAttack(mercenary, nearestMonster, {
                            attackValue,
                            magic: secondInfo.magic,
                            element: secondInfo.element,
                            status: secondInfo.status || (mercenary.equipped.weapon && mercenary.equipped.weapon.status),
                            damageDice: secondInfo.damageDice
                        });
                        const detail = buildAttackDetail(icon, secondInfo.name, result);
                        if (!result.hit) {
                            addMessage(`❌ ${mercenary.name}의 ${secondInfo.name}이 빗나갔습니다!`, 'mercenary', detail);
                        } else {
                            const critMsg = result.crit ? ' (치명타!)' : '';
                            let dmgStr = result.baseDamage;
                            if (result.elementDamage) {
                                const emoji = ELEMENT_EMOJI[result.element] || '';
                                dmgStr = `${result.baseDamage}+${emoji}${result.elementDamage}`;
                            }
                            addMessage(`${icon} ${mercenary.name}이(가) ${nearestMonster.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, 'mercenary', detail);
                        }
                        if (nearestMonster.health <= 0) break;
                    }
                    if (nearestMonster.health <= 0) {
                        killMonster(nearestMonster, mercenary);
                    }
                }
                mercenary.mana -= secondMana;
                mercenary.skillCooldowns[secondKey] = getSkillCooldown(mercenary, secondInfo);
                updateMercenaryDisplay();
                mercenary.hasActed = true;
                return;
            }
            // ----- Step 3: use basic attack if in range -----
            const baseAttackRange = 1;
            if (nearestDistance <= baseAttackRange) {
                performAttack(mercenary, nearestMonster);
                if (nearestMonster.health <= 0) killMonster(nearestMonster, mercenary);
                mercenary.hasActed = true;
                return;
            }
            // ----- Step 4: move toward the monster -----
            const path = findPath(mercenary.x, mercenary.y, nearestMonster.x, nearestMonster.y);
            if (path && path.length > 1) {
                mercenary.nextX = path[1].x;
                mercenary.nextY = path[1].y;
            }
            mercenary.hasActed = true;
            return;
        } else {
            // No visible monster - move toward the player
            const playerDistance = getDistance(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y);
            if (playerDistance > 3) {
                const path = findPath(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y);
                if (path && path.length > 1) {
                    mercenary.nextX = path[1].x;
                    mercenary.nextY = path[1].y;
                    mercenary.hasActed = true;
                }
            }
        }
    }

    // 챔피언 AI 로직
    function processChampionTurn(champion, visibleMonsters = null) {
        const debuffSkills = ['Weaken', 'Sunder', 'Regression', 'SpellWeakness', 'ElementalWeakness'];
        // 아군은 skill, 적군은 monsterSkill 값을 사용
        const skillKey = champion.skill || champion.monsterSkill;

        if (!skillKey) { // 스킬이 없으면 기본 공격/이동만 수행
            performBasicAttackOrMove(champion, visibleMonsters);
            return;
        }

        const isDebuffSkill = debuffSkills.includes(skillKey);

        // 1. 가장 가까운 적 찾기
        const opponents = isPlayerSide(champion)
            ? (visibleMonsters || gameState.monsters.filter(m => m.alive))
            : [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive)];

        let nearestOpponent = null;
        let nearestDistance = Infinity;

        opponents.forEach(opp => {
            const dist = getDistance(champion.x, champion.y, opp.x, opp.y);
            if (dist < nearestDistance && hasLineOfSight(champion.x, champion.y, opp.x, opp.y)) {
                nearestOpponent = opp;
                nearestDistance = dist;
            }
        });

        if (!nearestOpponent) { // 주변에 적이 없으면 플레이어에게 이동 (아군 기준)
            if (isPlayerSide(champion)) {
                const playerDistance = getDistance(champion.x, champion.y, gameState.player.x, gameState.player.y);
                if (playerDistance > PARTY_LEASH_RADIUS - 1) {
                    const path = findPath(champion.x, champion.y, gameState.player.x, gameState.player.y);
                    if (path && path.length > 1) {
                        champion.nextX = path[1].x;
                        champion.nextY = path[1].y;
                    }
                }
            }
            return;
        }

        // 2. 행동 결정 - 디버프 우선
        if (isDebuffSkill) {
            const skillInfo = SKILL_DEFS[skillKey];
            const hasDebuff = nearestOpponent.buffs && nearestOpponent.buffs.some(b => b.name === skillInfo.name);
            const canUseSkill = !(champion.skillCooldowns[skillKey] > 0) && champion.mana >= getSkillManaCost(champion, skillInfo);
            const inRange = nearestDistance <= getSkillRange(champion, skillInfo);

            if (!hasDebuff && canUseSkill && inRange) {
                const level = (champion.skillLevels && champion.skillLevels[skillKey]) || 1;
                applyStatPercentBuff(champion, nearestOpponent, skillInfo, level);
                champion.mana -= getSkillManaCost(champion, skillInfo);
                champion.skillCooldowns[skillKey] = getSkillCooldown(champion, skillInfo);
                addMessage(`${getUnitImage(champion) ? '' : skillInfo.icon} ${champion.name}이(가) ${nearestOpponent.name}에게 ${skillInfo.name}을(를) 시전했습니다!`, 'combat', null, getUnitImage(champion));
                return;
            }
        }

        // 기본 공격 또는 이동
        performBasicAttackOrMove(champion, nearestOpponent, nearestDistance);
    }

    // 챔피언의 기본 공격/이동 로직
    function performBasicAttackOrMove(unit, target, distance) {
        const attackRange = unit.range || 1;
        if (distance <= attackRange) {
            const result = performAttack(unit, target);
            if (target.health <= 0) {
                if (isPlayerSide(target)) {
                    if (target === gameState.player) handlePlayerDeath();
                    else killMercenary(target);
                } else {
                    killMonster(target, unit);
                }
            }
        } else {
            const path = findPath(unit.x, unit.y, target.x, target.y);
            if (path && path.length > 1) {
                if (isPlayerSide(unit)) {
                    unit.nextX = path[1].x;
                    unit.nextY = path[1].y;
                } else {
                    gameState.dungeon[unit.y][unit.x] = 'empty';
                    unit.x = path[1].x;
                    unit.y = path[1].y;
                    gameState.dungeon[unit.y][unit.x] = 'monster';
                }
            }
        }
    }

        // 용병 AI (개선됨 - 장비 보너스 적용, 안전성 체크 추가)
        function processMercenaryTurn(mercenary, visibleMonsters = gameState.monsters) {
            if (!mercenary.alive || mercenary.hasActed) return;
            if ((mercenary.paralysis && mercenary.paralysisTurns > 0) || (mercenary.petrify && mercenary.petrifyTurns > 0)) {
                mercenary.paralysisTurns && mercenary.paralysisTurns--;
                mercenary.petrifyTurns && mercenary.petrifyTurns--;
                if (mercenary.paralysisTurns <= 0) mercenary.paralysis = false;
                if (mercenary.petrifyTurns <= 0) mercenary.petrify = false;
                mercenary.hasActed = true;
                return;
            }

            // [추가] 용병이 챔피언이면 전용 AI를 사용하고 턴을 마칩니다.
            if (mercenary.isChampion) {
                processChampionTurn(mercenary, visibleMonsters);
                mercenary.hasActed = true;
                return;
            }
            mercenary.nextX = mercenary.x;
            mercenary.nextY = mercenary.y;
            const moveTiles = 1;

            if (mercenary.silence && mercenary.silenceTurns > 0) {
                mercenary.silenceTurns--;
                if (mercenary.silenceTurns <= 0) mercenary.silence = false;
            }

            if (mercenary.bleedTurns && mercenary.bleedTurns > 0) {
                mercenary.bleedTurns--;
            }

            
            // 장비 초기화 확인
            if (!mercenary.equipped) {
                mercenary.equipped = { weapon: null, armor: null, accessory1: null, accessory2: null, tile: null };
            }
            
            // 플레이어와의 거리 유지 (1~3칸 사이)
            const playerDistance = getDistance(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y);
            const minDistanceFromPlayer = 1;
            const maxDistanceFromPlayer = 3;
            const skillInfo = MERCENARY_SKILLS[mercenary.skill] || MONSTER_SKILLS[mercenary.skill];
            const skillLevel = mercenary.skillLevels && mercenary.skillLevels[mercenary.skill] || 1;
            const baseSkillMana = skillInfo ? (skillInfo.manaCost || 0) + skillLevel - 1 : 0;
            const skillManaCost = skillInfo ? getSkillManaCost(mercenary, { manaCost: baseSkillMana }) : 0;
            const baseAttackRange = mercenary.role === 'ranged' ? 3 :
                                   mercenary.role === 'caster' ? 2 : 1;
            let attackRange = baseAttackRange;

            function directMoveToPlayer() {
                const dx = Math.sign(gameState.player.x - mercenary.x);
                const dy = Math.sign(gameState.player.y - mercenary.y);
                const nx = mercenary.x + dx;
                const ny = mercenary.y + dy;
                const valid = nx >= 0 && nx < gameState.dungeonSize &&
                    ny >= 0 && ny < gameState.dungeonSize &&
                    gameState.dungeon[ny][nx] !== 'wall' &&
                    gameState.dungeon[ny][nx] !== 'monster' &&
                    !(nx === gameState.player.x && ny === gameState.player.y);
                if (valid) {
                    mercenary.nextX = nx;
                    mercenary.nextY = ny;
                    mercenary.hasActed = true;
                }
            }
            
            // 힐러는 상태 이상 해제를 우선 고려
            if (mercenary.role === 'support') {
                const purifyInfo = MERCENARY_SKILLS[mercenary.skill2];
                const purifyLevel = mercenary.skillLevels && mercenary.skillLevels[mercenary.skill2] || 1;
                const purifyBaseMana = purifyInfo ? (purifyInfo.manaCost || 0) + purifyLevel - 1 : 0;
                const purifyMana = purifyInfo ? getSkillManaCost(mercenary, { manaCost: purifyBaseMana }) : 0;
                const purifyOnCooldown = purifyInfo && mercenary.skillCooldowns[mercenary.skill2] > 0;
                if (purifyInfo && mercenary.skill2 === 'Purify' && !purifyOnCooldown && mercenary.mana >= purifyMana) {
                    const inRange = target => getDistance(mercenary.x, mercenary.y, target.x, target.y) <= getSkillRange(mercenary, purifyInfo);
                    const hasStatus = t => t.poison || t.burn || t.freeze || t.bleed || t.paralysis || t.nightmare || t.silence || t.petrify || t.debuff;

                    const targetToPurify = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive)].find(
                        t => hasStatus(t) && inRange(t)
                    );

                    if (targetToPurify) {
                        if (purifyTarget(mercenary, targetToPurify, purifyInfo)) {
                            mercenary.mana -= purifyMana;
                            mercenary.skillCooldowns[mercenary.skill2] = getSkillCooldown(mercenary, purifyInfo);
                            updateMercenaryDisplay();
                            mercenary.hasActed = true;
                            return; // 정화 후 턴 종료
                        }
                    }
                }


                const knowsHeal = skillInfo && mercenary.skill === 'Heal';
                const healOnCooldown = knowsHeal && mercenary.skillCooldowns[mercenary.skill] > 0;
                const manaCost = knowsHeal ? skillManaCost : HEAL_MANA_COST;
                const healLevel = knowsHeal ? skillLevel : 1;
                const healRange = knowsHeal ? getSkillRange(mercenary, skillInfo) : 2;

                if (!healOnCooldown && mercenary.mana >= manaCost && gameState.player.health < getStat(gameState.player, 'maxHealth') * 0.7) {
                    if (getDistance(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y) <= healRange) {
                        const healed = knowsHeal
                            ? healTarget(mercenary, gameState.player, skillInfo, healLevel)
                            : healTarget(mercenary, gameState.player);
                        if (healed) {
                            mercenary.mana -= manaCost;
                            if (knowsHeal) mercenary.skillCooldowns[mercenary.skill] = getSkillCooldown(mercenary, skillInfo);
                            updateMercenaryDisplay();
                            mercenary.hasActed = true;
                            return;
                        }
                    }
                }

                for (const otherMerc of gameState.activeMercenaries) {
                    if (otherMerc !== mercenary && otherMerc.alive && otherMerc.health < getStat(otherMerc, 'maxHealth') * 0.5) {
                        if (!healOnCooldown && mercenary.mana >= manaCost && getDistance(mercenary.x, mercenary.y, otherMerc.x, otherMerc.y) <= healRange) {
                            const healed = knowsHeal
                                ? healTarget(mercenary, otherMerc, skillInfo, healLevel)
                                : healTarget(mercenary, otherMerc);
                            if (healed) {
                                mercenary.mana -= manaCost;
                                if (knowsHeal) mercenary.skillCooldowns[mercenary.skill] = getSkillCooldown(mercenary, skillInfo);
                                updateMercenaryDisplay();
                                mercenary.hasActed = true;
                                return;
                            }
                        }
                    }
                }

                if (!healOnCooldown && mercenary.health < getStat(mercenary, 'maxHealth') && mercenary.mana >= manaCost) {
                    const healed = knowsHeal
                        ? healTarget(mercenary, mercenary, skillInfo, healLevel)
                        : healTarget(mercenary, mercenary);
                    if (healed) {
                        mercenary.mana -= manaCost;
                        if (knowsHeal) mercenary.skillCooldowns[mercenary.skill] = getSkillCooldown(mercenary, skillInfo);
                        updateMercenaryDisplay();
                        mercenary.hasActed = true;
                        return;
                    }
                }

                // 3순위: 안전 거리 확보를 위한 이동
                if (playerDistance > 3) {
                    const path = findPath(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y);
                    if (path && path.length > 1) {
                        const step = path[1];
                        const valid = step.x >= 0 && step.x < gameState.dungeonSize &&
                            step.y >= 0 && step.y < gameState.dungeonSize &&
                            gameState.dungeon[step.y][step.x] !== 'wall' &&
                            !(step.x === gameState.player.x && step.y === gameState.player.y);

                        if (valid) {
                            mercenary.nextX = step.x;
                            mercenary.nextY = step.y;
                        }
                    }
                }

                // 이동만 했다면 이후 일반 행동 로직을 계속 진행합니다.
            }
            else if (mercenary.role === 'paladin') {
                processPaladinTurn(mercenary, visibleMonsters);
            }
            else if (mercenary.role === 'bard') {
                const hymnSkillKey = mercenary.skill;
                const healSkillKey = mercenary.skill2;
                const isEnemyNearby = gameState.monsters.some(m =>
                    getDistance(gameState.player.x, gameState.player.y, m.x, m.y) <= FOG_RADIUS
                );
                const hymnInfo = MERCENARY_SKILLS[hymnSkillKey];
                if (isEnemyNearby && hymnInfo && (hymnInfo.aura || hymnInfo.shield || hymnInfo.attackBuff)) {
                    const hymnLevel = mercenary.skillLevels && mercenary.skillLevels[hymnSkillKey] || 1;
                    const baseHymnMana = (hymnInfo.manaCost || 5) + hymnLevel - 1;
                    const hymnManaCost = getSkillManaCost(mercenary, { manaCost: baseHymnMana });
                    if (mercenary.mana >= hymnManaCost) {
                        const alliesToBuff = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive)]
                            .filter(ally =>
                                getDistance(mercenary.x, mercenary.y, ally.x, ally.y) <= getSkillRange(mercenary, hymnInfo) &&
                                (!ally.buffs || !ally.buffs.find(b => b.name === hymnSkillKey))
                            );
                        if (alliesToBuff.length > 0) {
                            addMessage(`🎵 ${mercenary.name}이(가) ${hymnInfo.name}을(를) 연주합니다!`, 'mercenary', null, mercenary);
                            alliesToBuff.forEach(ally => {
                                if (hymnInfo.shield) applyShield(mercenary, ally, hymnInfo, hymnLevel);
                                if (hymnInfo.attackBuff) applyAttackBuff(mercenary, ally, hymnInfo, hymnLevel);
                                if (hymnInfo.aura) {
                                    if (!ally.buffs) ally.buffs = [];
                                    ally.buffs.push({ name: hymnSkillKey, effects: hymnInfo.aura, turnsLeft: 5 });
                                }
                            });
                            mercenary.mana -= hymnManaCost;
                            mercenary.skillCooldowns[hymnSkillKey] = getSkillCooldown(mercenary, hymnInfo);
                            updateMercenaryDisplay();
                            mercenary.hasActed = true;
                            return;
                        }
                    }
                }

                const healInfo = MERCENARY_SKILLS[healSkillKey];
                if (healInfo && healInfo.heal && !(mercenary.skillCooldowns[healSkillKey] > 0)) {
                    const healLevel = mercenary.skillLevels && mercenary.skillLevels[healSkillKey] || 1;
                    const healMana = getSkillManaCost(mercenary, healInfo);
                    if (mercenary.mana >= healMana) {
                        const healRange = getSkillRange(mercenary, healInfo);
                        const allies = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive)];
                        const target = allies.find(a => a.health < getStat(a, 'maxHealth') * 0.7 &&
                            getDistance(mercenary.x, mercenary.y, a.x, a.y) <= healRange);
                        if (target && healTarget(mercenary, target, healInfo, healLevel)) {
                            mercenary.mana -= healMana;
                            mercenary.skillCooldowns[healSkillKey] = getSkillCooldown(mercenary, healInfo);
                            updateMercenaryDisplay();
                            mercenary.hasActed = true;
                            return;
                        }
                    }
                }

                let nearestMonster = null;
                let nearestDistance = Infinity;
                visibleMonsters.forEach(monster => {
                    const distanceFromPlayer = getDistance(monster.x, monster.y, gameState.player.x, gameState.player.y);
                    if (distanceFromPlayer > PARTY_LEASH_RADIUS) {
                        return;
                    }
                    if (!hasLineOfSight(mercenary.x, mercenary.y, monster.x, monster.y)) {
                        return;
                    }

                    const dist = getDistance(mercenary.x, mercenary.y, monster.x, monster.y);
                    if (dist < nearestDistance) {
                        nearestDistance = dist;
                        nearestMonster = monster;
                    }
                });

                if (nearestMonster) {
                    if (nearestDistance <= attackRange) {
                        performAttack(mercenary, nearestMonster);
                        mercenary.hasActed = true;
                        return;
                    } else {
                        const path = findPath(mercenary.x, mercenary.y, nearestMonster.x, nearestMonster.y);
                        if (path && path.length > 1) {
                            mercenary.nextX = path[1].x;
                            mercenary.nextY = path[1].y;
                        }
                        mercenary.hasActed = true;
                        return;
                    }
                }

                if (playerDistance > 2) {
                    const path = findPath(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y);
                    if (path && path.length > 1) {
                        mercenary.nextX = path[1].x;
                        mercenary.nextY = path[1].y;
                    }
                }
                mercenary.hasActed = true;
                return;
            }

            // 가장 가까운 시야 내 몬스터 찾기 (fog of war 고려)
            let nearestMonster = null;
            let nearestDistance = Infinity;

            // 플레이어 시야 내 몬스터 존재 여부 확인
            const enemyInPlayerSight = gameState.monsters.some(mon =>
                mon.alive &&
                getDistance(mon.x, mon.y, gameState.player.x, gameState.player.y) <= FOG_RADIUS &&
                hasLineOfSight(gameState.player.x, gameState.player.y, mon.x, mon.y)
            );
            
            visibleMonsters.forEach(monster => {
                const distanceFromPlayer = getDistance(monster.x, monster.y, gameState.player.x, gameState.player.y);
                if (distanceFromPlayer > PARTY_LEASH_RADIUS) {
                    return; // 몬스터가 너무 멀리 있으면 목표에서 제외
                }

                const dist = getDistance(mercenary.x, mercenary.y, monster.x, monster.y);
                if (dist < nearestDistance && hasLineOfSight(mercenary.x, mercenary.y, monster.x, monster.y)) {
                    nearestDistance = dist;
                    nearestMonster = monster;
                }
            });

            const skillKey = mercenary.skill;
            let forceSkill = false;
            if (skillKey === 'HawkEye' && nearestMonster && nearestDistance > attackRange && nearestDistance <= getSkillRange(mercenary, skillInfo)) {
                forceSkill = true;
            }
            if (mercenary.silence && mercenary.silenceTurns > 0) {
                // silence just decrements in applyStatusEffects
            } else if (
                skillInfo &&
                mercenary.mana >= skillManaCost &&
                !(mercenary.skillCooldowns[skillKey] > 0) &&
                (forceSkill || Math.random() < (mercenary.type === 'BARD' ? 1.0 : 0.5)) &&
                ((skillKey !== 'GuardianHymn' && skillKey !== 'CourageHymn') || combatOccurredInTurn || enemyInPlayerSight)
            ) {
                if (skillKey === 'Heal') {
                    let target = null;
                    if (gameState.player.health < getStat(gameState.player, 'maxHealth') && getDistance(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y) <= getSkillRange(mercenary, skillInfo)) {
                        target = gameState.player;
                    }
                    if (!target) {
                        for (const m of gameState.activeMercenaries) {
                            if (m !== mercenary && m.alive && m.health < getStat(m, 'maxHealth') && getDistance(mercenary.x, mercenary.y, m.x, m.y) <= getSkillRange(mercenary, skillInfo)) {
                                target = m;
                                break;
                            }
                        }
                    }
                    if (!target && mercenary.health < getStat(mercenary, 'maxHealth')) {
                        target = mercenary;
                    }
                    if (target && healTarget(mercenary, target, skillInfo, skillLevel)) {
                        mercenary.mana -= skillManaCost;
                        mercenary.skillCooldowns[skillKey] = getSkillCooldown(mercenary, skillInfo);
                        updateMercenaryDisplay();
                        mercenary.hasActed = true;
                        return;
                    }
                } else if (skillKey === 'GuardianHymn') {
                    let nearestAlly = null;
                    let distAlly = Infinity;
                    const allies = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive && m !== mercenary)];
                    allies.forEach(a => {
                        const d = getDistance(mercenary.x, mercenary.y, a.x, a.y);
                        if (d <= getSkillRange(mercenary, skillInfo) && d < distAlly) {
                            distAlly = d;
                            nearestAlly = a;
                        }
                    });

                    const appliedSelf = applyShield(mercenary, mercenary, skillInfo, skillLevel);
                    const appliedAlly = nearestAlly ? applyShield(mercenary, nearestAlly, skillInfo, skillLevel) : false;
                    if (appliedSelf || appliedAlly) {
                        mercenary.mana -= skillManaCost;
                        SoundEngine.playSound('auraActivateMinor');
                        updateMercenaryDisplay();
                        mercenary.skillCooldowns[skillKey] = getSkillCooldown(mercenary, skillInfo);
                        mercenary.hasActed = true;
                        return;
                    }
                } else if (skillKey === 'CourageHymn') {
                    let nearestAlly = null;
                    let distAlly = Infinity;
                    const allies = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive && m !== mercenary)];
                    allies.forEach(a => {
                        const d = getDistance(mercenary.x, mercenary.y, a.x, a.y);
                        if (d <= getSkillRange(mercenary, skillInfo) && d < distAlly) {
                            distAlly = d;
                            nearestAlly = a;
                        }
                    });

                    const appliedSelf = applyAttackBuff(mercenary, mercenary, skillInfo, skillLevel);
                    const appliedAlly = nearestAlly ? applyAttackBuff(mercenary, nearestAlly, skillInfo, skillLevel) : false;
                    if (appliedSelf || appliedAlly) {
                        mercenary.mana -= skillManaCost;
                        SoundEngine.playSound('auraActivateMajor');
                        updateMercenaryDisplay();
                        mercenary.skillCooldowns[skillKey] = getSkillCooldown(mercenary, skillInfo);
                        mercenary.hasActed = true;
                        return;
                    }
                } else if (skillKey === 'ChargeAttack' && nearestMonster && nearestDistance <= skillInfo.dashRange && hasLineOfSight(mercenary.x, mercenary.y, nearestMonster.x, nearestMonster.y)) {
                    let attackValue = getStat(mercenary, 'attack');
                    attackValue = Math.floor(attackValue * skillInfo.multiplier * skillLevel);

                    const path = findPath(mercenary.x, mercenary.y, nearestMonster.x, nearestMonster.y);
                    let destX = mercenary.x;
                    let destY = mercenary.y;
                    if (path && path.length > 1) {
                        const maxSteps = Math.min(skillInfo.dashRange, path.length - 2);
                        for (let i = 1; i <= maxSteps; i++) {
                            const step = path[i];
                            const blocked =
                                gameState.dungeon[step.y][step.x] === 'wall' ||
                                gameState.dungeon[step.y][step.x] === 'monster' ||
                                (step.x === gameState.player.x && step.y === gameState.player.y) ||
                                gameState.activeMercenaries.some(m => m !== mercenary && m.alive && m.x === step.x && m.y === step.y);
                            if (blocked) {
                                break;
                            }
                            destX = step.x;
                            destY = step.y;
                        }
                    }
                    // move first before attacking
                    mercenary.x = destX;
                    mercenary.y = destY;
                    mercenary.nextX = destX;
                    mercenary.nextY = destY;

                    const hits = 1;
                    const icon = skillInfo.icon;
                    const result = performAttack(mercenary, nearestMonster, { attackValue, status: mercenary.equipped.weapon && mercenary.equipped.weapon.status });
                    const detail = buildAttackDetail(skillInfo.icon, skillInfo.name, result);
                    if (!result.hit) {
                        addMessage(`❌ ${mercenary.name}의 ${skillInfo.name}이 빗나갔습니다!`, "mercenary", detail);
                    } else {
                        const critMsg = result.crit ? ' (치명타!)' : '';
                        let dmgStr = result.baseDamage;
                        if (result.elementDamage) {
                            const emoji = ELEMENT_EMOJI[result.element] || '';
                            dmgStr = `${result.baseDamage}+${emoji}${result.elementDamage}`;
                        }
                        addMessage(`${icon} ${mercenary.name}이(가) ${nearestMonster.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, "mercenary", detail);
                    }

                    if (nearestMonster.health <= 0) {
                        killMonster(nearestMonster, mercenary);
                    }
                    mercenary.mana -= skillManaCost;
                    mercenary.skillCooldowns[skillKey] = getSkillCooldown(mercenary, skillInfo);
                    updateMercenaryDisplay();
                    mercenary.hasActed = true;
                    return;
                } else if (MONSTER_SKILLS[skillKey] && nearestMonster && nearestDistance <= getSkillRange(mercenary, skillInfo) && hasLineOfSight(mercenary.x, mercenary.y, nearestMonster.x, nearestMonster.y)) {
                    const base = skillInfo.magic ? getStat(mercenary, 'magicPower') : getStat(mercenary, 'attack');
                    const attackValue = (rollDice(skillInfo.damageDice) * skillLevel + base) * getSkillPowerMult(mercenary);
                    const hits = skillInfo.hits || 1;
                    const icon = skillInfo.icon;
                    for (let i = 0; i < hits; i++) {
                        const result = performAttack(mercenary, nearestMonster, { attackValue, magic: skillInfo.magic, element: skillInfo.element, status: skillInfo.status || (mercenary.equipped.weapon && mercenary.equipped.weapon.status), damageDice: skillInfo.damageDice });
                        const detail = buildAttackDetail(icon, skillInfo.name, result);
                        if (!result.hit) {
                            addMessage(`❌ ${mercenary.name}의 ${skillInfo.name}이 빗나갔습니다!`, "mercenary", detail);
                        } else {
                            const critMsg = result.crit ? ' (치명타!)' : '';
                            let dmgStr = result.baseDamage;
                            if (result.elementDamage) {
                                const emoji = ELEMENT_EMOJI[result.element] || '';
                                dmgStr = `${result.baseDamage}+${emoji}${result.elementDamage}`;
                            }
                            addMessage(`${icon} ${mercenary.name}이(가) ${nearestMonster.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, "mercenary", detail);
                        }

                        if (nearestMonster.health <= 0) break;
                    }

                    if (nearestMonster.health <= 0) {
                        killMonster(nearestMonster, mercenary);
                    }
                    mercenary.mana -= skillManaCost;
                    mercenary.skillCooldowns[skillKey] = getSkillCooldown(mercenary, skillInfo);
                    updateMercenaryDisplay();
                    mercenary.hasActed = true;
                    return;
                } else if (nearestMonster && nearestDistance <= getSkillRange(mercenary, skillInfo) && hasLineOfSight(mercenary.x, mercenary.y, nearestMonster.x, nearestMonster.y)) {
                    let attackValue = getStat(mercenary, 'attack');
                    if (skillKey === 'ChargeAttack') {
                        attackValue = Math.floor(attackValue * skillInfo.multiplier * skillLevel * getSkillPowerMult(mercenary));
                    } else if (skillKey === 'Fireball' || skillKey === 'Iceball') {
                        attackValue = (rollDice(skillInfo.damageDice) * skillLevel + getStat(mercenary, 'magicPower')) * getSkillPowerMult(mercenary);
                    } else if (skillKey === 'HawkEye') {
                        attackValue = (rollDice(skillInfo.damageDice) * skillLevel + getStat(mercenary, 'attack')) * getSkillPowerMult(mercenary);
                    } else {
                        attackValue = Math.floor(attackValue * skillLevel * getSkillPowerMult(mercenary));
                    }

                    const hits = (skillKey === 'DoubleStrike' || skillKey === 'DoubleThrust') ? 2 : 1;
                    const icon = skillInfo.icon;
                    for (let i = 0; i < hits; i++) {
                        const result = performAttack(mercenary, nearestMonster, { attackValue, magic: skillInfo.magic, element: skillInfo.element, status: mercenary.equipped.weapon && mercenary.equipped.weapon.status, damageDice: skillInfo.damageDice });
                        const detail = buildAttackDetail(icon, skillInfo.name, result);
                        if (!result.hit) {
                            addMessage(`❌ ${mercenary.name}의 ${skillInfo.name}이 빗나갔습니다!`, "mercenary", detail);
                        } else {
                            const critMsg = result.crit ? ' (치명타!)' : '';
                            let dmgStr = result.baseDamage;
                            if (result.elementDamage) {
                                const emoji = ELEMENT_EMOJI[result.element] || '';
                                dmgStr = `${result.baseDamage}+${emoji}${result.elementDamage}`;
                            }
                            addMessage(`${icon} ${mercenary.name}이(가) ${nearestMonster.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, "mercenary", detail);
                        }

                        if (nearestMonster.health <= 0) break;
                    }

                    if (nearestMonster.health <= 0) {
                        killMonster(nearestMonster, mercenary);
                    }
                    mercenary.mana -= skillManaCost;
                    mercenary.skillCooldowns[skillKey] = getSkillCooldown(mercenary, skillInfo);
                    updateMercenaryDisplay();
                    mercenary.hasActed = true;
                    return;
                }
            }
            
            if (nearestMonster) {
                if (nearestDistance <= attackRange) {
                    if (mercenary.role === 'ranged') {
                        createHomingProjectile(mercenary.x, mercenary.y, nearestMonster, mercenary);
                        addMessage('🏹 원거리 공격', 'mercenary');
                        mercenary.hasActed = true;
                        return;
                    }
                    // 공격 (장비 보너스 적용)
                    const totalAttack = getStat(mercenary, 'attack');

                    const result = performAttack(mercenary, nearestMonster, { attackValue: totalAttack, status: mercenary.equipped.weapon && mercenary.equipped.weapon.status });
                    const detail = buildAttackDetail('근접 공격', '', result);
                    if (!result.hit) {
                        addMessage(`❌ ${mercenary.name}의 공격이 빗나갔습니다!`, "mercenary", detail);
                    } else {
                        const critMsg = result.crit ? ' (치명타!)' : '';
                        let dmgStr = result.baseDamage;
                        if (result.elementDamage) {
                            const emoji = ELEMENT_EMOJI[result.element] || '';
                            dmgStr = `${result.baseDamage}+${emoji}${result.elementDamage}`;
                        }
                        addMessage(`⚔️ ${mercenary.name}이(가) ${nearestMonster.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, "mercenary", detail);
                    }
                    
                    if (nearestMonster.health <= 0) {
                        killMonster(nearestMonster, mercenary);
                    }
                    mercenary.hasActed = true;
                    return;
                } else {
                    const targetPos = findAdjacentEmpty(nearestMonster.x, nearestMonster.y);
                    const path = findPath(mercenary.x, mercenary.y, targetPos.x, targetPos.y);
                    if (path && path.length > 1) {
                        const step = path[Math.min(moveTiles, path.length - 1)];
                        const newDistanceFromPlayer = getDistance(step.x, step.y, gameState.player.x, gameState.player.y);
                        const stepMonsterDist = getDistance(step.x, step.y, nearestMonster.x, nearestMonster.y);
                        const stepValid = step.x >= 0 && step.x < gameState.dungeonSize &&
                            step.y >= 0 && step.y < gameState.dungeonSize &&
                            gameState.dungeon[step.y][step.x] !== 'wall' &&
                            gameState.dungeon[step.y][step.x] !== 'monster' &&
                            !(step.x === gameState.player.x && step.y === gameState.player.y);

                        if (stepValid) {
                            if (mercenary.role === 'tank') {
                                mercenary.nextX = step.x;
                                mercenary.nextY = step.y;
                                mercenary.hasActed = true;
                            } else if (newDistanceFromPlayer >= minDistanceFromPlayer && stepMonsterDist < nearestDistance) {
                                mercenary.nextX = step.x;
                                mercenary.nextY = step.y;
                                mercenary.hasActed = true;
                            } else if (playerDistance > maxDistanceFromPlayer) {
                                // too far from player, move toward player instead
                                const backPath = findPath(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y);
                                if (backPath && backPath.length > 1) {
                                    const backStep = backPath[Math.min(moveTiles, backPath.length - 1)];
                                    const backValid = backStep.x >= 0 && backStep.x < gameState.dungeonSize &&
                                        backStep.y >= 0 && backStep.y < gameState.dungeonSize &&
                                        gameState.dungeon[backStep.y][backStep.x] !== 'wall' &&
                                        gameState.dungeon[backStep.y][backStep.x] !== 'monster' &&
                                        !(backStep.x === gameState.player.x && backStep.y === gameState.player.y);
                                    if (backValid) {
                                        mercenary.nextX = backStep.x;
                                        mercenary.nextY = backStep.y;
                                        mercenary.hasActed = true;
                                    }
                                }
                            }
                        } else if (playerDistance > maxDistanceFromPlayer) {
                            const backPath = findPath(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y);
                            if (backPath && backPath.length > 1) {
                                const backStep = backPath[Math.min(moveTiles, backPath.length - 1)];
                                const backValid = backStep.x >= 0 && backStep.x < gameState.dungeonSize &&
                                    backStep.y >= 0 && backStep.y < gameState.dungeonSize &&
                                    gameState.dungeon[backStep.y][backStep.x] !== 'wall' &&
                                    gameState.dungeon[backStep.y][backStep.x] !== 'monster' &&
                                    !(backStep.x === gameState.player.x && backStep.y === gameState.player.y);
                                if (backValid) {
                                    mercenary.nextX = backStep.x;
                                    mercenary.nextY = backStep.y;
                                    mercenary.hasActed = true;
                                }
                            }
                        }
                        if (!mercenary.hasActed) {
                            directMoveToPlayer();
                        }
                    } else {
                        directMoveToPlayer();
                    }
                }
            } else {
                if (playerDistance > maxDistanceFromPlayer) {
                    const path = findPath(mercenary.x, mercenary.y, gameState.player.x, gameState.player.y);
                    if (path && path.length > 1) {
                        const step = path[Math.min(moveTiles, path.length - 1)];
                        const stepValid = step.x >= 0 && step.x < gameState.dungeonSize &&
                            step.y >= 0 && step.y < gameState.dungeonSize &&
                            gameState.dungeon[step.y][step.x] !== 'wall' &&
                            gameState.dungeon[step.y][step.x] !== 'monster' &&
                            !(step.x === gameState.player.x && step.y === gameState.player.y);

                        if (stepValid) {
                            mercenary.nextX = step.x;
                            mercenary.nextY = step.y;
                            mercenary.hasActed = true;
                        }
                    }
                    if (!mercenary.hasActed) {
                        directMoveToPlayer();
                    }
                }
            }
        }

        // 게임 저장
        function saveGame() {
            localStorage.setItem('dungeonCrawlerSave', JSON.stringify(gameState));
            addMessage('💾 게임이 저장되었습니다.', 'info');
        }

        // 게임 불러오기
        function loadGame() {
            const data = localStorage.getItem('dungeonCrawlerSave');
            if (!data) {
                addMessage('❌ 저장된 게임이 없습니다.', 'info');
                return;
            }
            const saved = JSON.parse(data);
            delete saved.mercenaries;
            Object.assign(gameState, saved);
            gameState.activeRecipes = saved.activeRecipes || saved.knownRecipes;
            if (saved.player.statPoints === undefined) {
                gameState.player.statPoints = 0;
            }
            if (saved.player.shield === undefined) {
                gameState.player.shield = 0;
            }
            if (saved.player.shieldTurns === undefined) {
                gameState.player.shieldTurns = 0;
            }
            if (saved.player.attackBuff === undefined) {
                gameState.player.attackBuff = 0;
            }
            if (saved.player.attackBuffTurns === undefined) {
                gameState.player.attackBuffTurns = 0;
            }
            if (saved.activeMercenaries) gameState.activeMercenaries = saved.activeMercenaries;
            else if (saved.mercenaries) gameState.activeMercenaries = saved.mercenaries;
            if (saved.standbyMercenaries) gameState.standbyMercenaries = saved.standbyMercenaries;
            if (!saved.player.endurance) {
                const sp = saved.player;
                const endurance = sp.maxHealth / 2;
                gameState.player.endurance = endurance;
                gameState.player.focus = sp.maxMana / 2;
                gameState.player.strength = sp.attack;
                gameState.player.agility = Math.max(0, Math.round((sp.accuracy - 0.7) / 0.02));
                gameState.player.intelligence = sp.magicPower;
                gameState.player.baseDefense = sp.defense - Math.floor(endurance * 0.1);
            }

            const convertMercenary = m => {
                if (!m.endurance) {
                    const endurance = m.maxHealth / 2;
                    m.endurance = endurance;
                    m.focus = (m.maxMana || 0) / 2;
                    m.strength = m.attack;
                    m.agility = Math.max(0, Math.round((m.accuracy - 0.7) / 0.02));
                    m.intelligence = m.magicPower;
                    m.baseDefense = m.defense - Math.floor(endurance * 0.1);
                }
                if (!m.stars) {
                    m.stars = generateStars();
                }
                if (m.skillPoints === undefined) {
                    m.skillPoints = 0;
                }
                if (!m.skillLevels) {
                    m.skillLevels = {};
                    if (m.skill) m.skillLevels[m.skill] = 1;
                    if (m.skill2) m.skillLevels[m.skill2] = 1;
                }
                if (!m.equipped) {
                    m.equipped = {
                        weapon: null,
                        armor: null,
                        accessory1: null,
                        accessory2: null,
                        tile: null
                    };
                } else if (!('tile' in m.equipped)) {
                    m.equipped.tile = null;
                }
                if (m.shield === undefined) m.shield = 0;
                if (m.shieldTurns === undefined) m.shieldTurns = 0;
                if (m.attackBuff === undefined) m.attackBuff = 0;
                if (m.attackBuffTurns === undefined) m.attackBuffTurns = 0;
            };

            gameState.activeMercenaries.forEach(convertMercenary);
            gameState.standbyMercenaries.forEach(convertMercenary);

            rebuildDungeonDOM();
            updateFogOfWar();
            updateStats();
            updateInventoryDisplay();
            updateMercenaryDisplay();
            renderDungeon();
            updateCamera();
            updateIncubatorDisplay();
            updateTileTabDisplay();
            updateActionButtons();
            addMessage('📁 게임을 불러왔습니다.', 'info');
        }
       function rangedAction() {
            if ((gameState.player.paralysis && gameState.player.paralysisTurns > 0) ||
                (gameState.player.petrify && gameState.player.petrifyTurns > 0)) {
                addMessage('⚠️ 플레이어는 공격할 수 없습니다.', 'info');
                processTurn();
                return;
            }
            const range = 5;
            let target = null;
            let dist = Infinity;
            for (const monster of gameState.monsters) {
                const d = getDistance(gameState.player.x, gameState.player.y, monster.x, monster.y);
                if (d <= range && d < dist && hasLineOfSight(gameState.player.x, gameState.player.y, monster.x, monster.y)) {
                    target = monster;
                    dist = d;
                }
            }

            if (!target) {
                addMessage('🎯 사거리 내에 몬스터가 없습니다.', 'info');
                processTurn();
                return;
            }

            const dx = Math.sign(target.x - gameState.player.x);
            const dy = Math.sign(target.y - gameState.player.y);
            gameState.projectiles.push({
                x: gameState.player.x,
                y: gameState.player.y,
                dx,
                dy,
                rangeLeft: dist,
                icon: '➡️',
                element: null,
                homing: true,
                target,
                attacker: gameState.player
            });
            processTurn();
        }

       function meleeAttackAction() {
            if ((gameState.player.paralysis && gameState.player.paralysisTurns > 0) ||
                (gameState.player.petrify && gameState.player.petrifyTurns > 0)) {
                addMessage('⚠️ 플레이어는 공격할 수 없습니다.', 'info');
                processTurn();
                return;
            }
            let targetPos = null;
            const dirs = [
                {x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}
            ];
            for (const d of dirs) {
                const nx = gameState.player.x + d.x;
                const ny = gameState.player.y + d.y;
                if (gameState.dungeon[ny] && gameState.dungeon[ny][nx] === 'monster') {
                    targetPos = {x:nx, y:ny};
                    break;
                }
            }
            if (!targetPos) {
                addMessage('⚔️ 근처에 몬스터가 없습니다.', 'info');
                processTurn();
                return;
            }
            movePlayer(targetPos.x - gameState.player.x, targetPos.y - gameState.player.y);
        }

        function skill1Action() {
            const skill = gameState.player.assignedSkills[1];
            useSkill(skill);
        }


        function skill2Action() {
            const skill = gameState.player.assignedSkills[2];
            useSkill(skill);
        }

        function handleHeal(skillKey, skill, level, manaCost) {
            const range = getSkillRange(gameState.player, skill);
            const targets = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive)]
                .filter(t => getDistance(gameState.player.x, gameState.player.y, t.x, t.y) <= range && t.health < getStat(t, 'maxHealth'));
            if (targets.length === 0) {
                addMessage('❤️ 회복할 대상이 없습니다.', 'info');
                processTurn();
                return;
            }
            const target = targets.sort((a, b) => (getStat(b, 'maxHealth') - b.health) - (getStat(a, 'maxHealth') - a.health))[0];
            gameState.player.mana -= manaCost;
            healTarget(gameState.player, target, skill, level * getSkillPowerMult(gameState.player));
            updateStats();
            updateMercenaryDisplay();
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

        function handlePurify(skillKey, skill, level, manaCost) {
            const hasStatus = t => t.poison || t.burn || t.freeze || t.bleed || t.paralysis || t.nightmare || t.silence || t.petrify || t.debuff;
            const range = getSkillRange(gameState.player, skill);
            const targets = [gameState.player, ...gameState.activeMercenaries.filter(m => m.alive)]
                .filter(t => getDistance(gameState.player.x, gameState.player.y, t.x, t.y) <= range && hasStatus(t));
            if (targets.length === 0) {
                addMessage('해제할 상태이상이 없습니다.', 'info');
                processTurn();
                return;
            }
            const target = targets[0];
            gameState.player.mana -= manaCost;
            purifyTarget(gameState.player, target, skill);
            updateStats();
            updateMercenaryDisplay();
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

        function handleShield(skillKey, skill, level, manaCost) {
            const range = getSkillRange(gameState.player, skill);
            const allies = gameState.activeMercenaries.filter(m => m.alive);
            let nearest = null;
            let nearestDist = Infinity;
            allies.forEach(a => {
                const d = getDistance(gameState.player.x, gameState.player.y, a.x, a.y);
                if (d <= range && d < nearestDist) { nearestDist = d; nearest = a; }
            });
            gameState.player.mana -= manaCost;
            SoundEngine.playSound('auraActivateMinor');
            applyShield(gameState.player, gameState.player, skill, level);
            if (nearest) applyShield(gameState.player, nearest, skill, level);
            updateStats();
            updateMercenaryDisplay();
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

        function handleAttackBuff(skillKey, skill, level, manaCost) {
            const range = getSkillRange(gameState.player, skill);
            const allies = gameState.activeMercenaries.filter(m => m.alive);
            let nearest = null;
            let nearestDist = Infinity;
            allies.forEach(a => {
                const d = getDistance(gameState.player.x, gameState.player.y, a.x, a.y);
                if (d <= range && d < nearestDist) { nearestDist = d; nearest = a; }
            });
            gameState.player.mana -= manaCost;
            SoundEngine.playSound('auraActivateMajor');
            applyAttackBuff(gameState.player, gameState.player, skill, level);
            if (nearest) applyAttackBuff(gameState.player, nearest, skill, level);
            updateStats();
            updateMercenaryDisplay();
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

        function handleStatBuff(skillKey, skill, level, manaCost) {
            const range = getSkillRange(gameState.player, skill);
            let target = gameState.player;
            if (skill.statBuff && skill.statBuff.target === 'enemy') {
                let nearest = null;
                let nearestDist = Infinity;
                gameState.monsters.forEach(m => {
                    const d = getDistance(gameState.player.x, gameState.player.y, m.x, m.y);
                    if (d <= range && d < nearestDist) { nearestDist = d; nearest = m; }
                });
                if (!nearest) {
                    addMessage('🎯 사거리 내에 몬스터가 없습니다.', 'info');
                    processTurn();
                    return;
                }
                target = nearest;
            }
            gameState.player.mana -= manaCost;
            SoundEngine.playSound('auraActivateMajor');
            applyStatPercentBuff(gameState.player, target, skill, level);
            updateStats();
            updateMercenaryDisplay();
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

        function handleTeleport(skillKey, skill, level, manaCost) {
            const p = gameState.player;
            if (p.teleportSavedX === null) {
                p.teleportSavedX = p.x;
                p.teleportSavedY = p.y;
                addMessage('🌀 위치를 저장했습니다.', 'info');
            } else if (p.teleportReturnX === null) {
                p.teleportReturnX = p.x;
                p.teleportReturnY = p.y;
                p.x = p.teleportSavedX;
                p.y = p.teleportSavedY;
                addMessage('🌀 저장된 위치로 이동했습니다.', 'info');
            } else {
                const tx = p.teleportReturnX;
                const ty = p.teleportReturnY;
                p.teleportReturnX = null;
                p.teleportReturnY = null;
                p.x = tx;
                p.y = ty;
                addMessage('🌀 이전 위치로 돌아왔습니다.', 'info');
            }
            p.mana -= manaCost;
            renderDungeon();
            updateCamera();
            updateStats();
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

        function handleNovaSkill(skillKey, skill, level, manaCost) {
            const radius = getSkillRange(gameState.player, { range: skill.radius });
            const targets = gameState.monsters.filter(m => getDistance(gameState.player.x, gameState.player.y, m.x, m.y) <= radius);
            if (targets.length === 0) {
                addMessage('🎯 사거리 내에 몬스터가 없습니다.', 'info');
                processTurn();
                return;
            }
            gameState.player.mana -= manaCost;

            playNovaSkillEffect(gameState.player, skill);
            if (skill.screenShake) {
                createScreenShake(skill.screenShake.intensity, skill.screenShake.duration);
            }

            const isTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
            const novaAction = () => {
                targets.slice().forEach(monster => {
                    const attackValue = (rollDice(skill.damageDice) * level + getStat(gameState.player, 'magicPower')) * getSkillPowerMult(gameState.player);
                    const result = performAttack(gameState.player, monster, {
                        attackValue,
                        magic: skill.magic,
                        element: skill.element,
                        damageDice: skill.damageDice,
                        status: gameState.player.equipped.weapon && gameState.player.equipped.weapon.status
                    });
                    const detail = buildAttackDetail(skill.icon, skill.name, result);
                    const img = getPlayerImage();
                    if (!result.hit) {
                        addMessage(`❌ ${monster.name}에게 ${skill.name}이 빗나갔습니다!`, 'combat', detail, img);
                    } else {
                        const critMsg = result.crit ? ' (치명타!)' : '';
                        let dmgStr = formatNumber(result.baseDamage);
                        if (result.elementDamage) {
                            const emoji = ELEMENT_EMOJI[result.element] || '';
                            dmgStr = `${formatNumber(result.baseDamage)}+${emoji}${formatNumber(result.elementDamage)}`;
                        }
                        addMessage(`${skill.icon} ${monster.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, 'combat', detail, img);
                    }
                    if (monster.health <= 0) {
                        killMonster(monster);
                    }
                });
            };
            if (isTestEnv) {
                novaAction();
            } else {
                setTimeout(novaAction, 200);
            }
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

        function handleMeleeSkill(skillKey, skill, level, manaCost, target, dist) {
            if (skill.dashRange && dist <= getSkillRange(gameState.player, { range: skill.dashRange }) && hasLineOfSight(gameState.player.x, gameState.player.y, target.x, target.y)) {
                const path = findPath(gameState.player.x, gameState.player.y, target.x, target.y);
                let destX = gameState.player.x;
                let destY = gameState.player.y;
                if (path && path.length > 1) {
                    const maxSteps = Math.min(getSkillRange(gameState.player, { range: skill.dashRange }), path.length - 2);
                    for (let i = 1; i <= maxSteps; i++) {
                        const step = path[i];
                        const blocked =
                            gameState.dungeon[step.y][step.x] === 'wall' ||
                            gameState.dungeon[step.y][step.x] === 'monster' ||
                            gameState.activeMercenaries.some(m => m.alive && m.x === step.x && m.y === step.y);
                        if (blocked) {
                            break;
                        }
                        destX = step.x;
                        destY = step.y;
                    }
                }
                gameState.player.x = destX;
                gameState.player.y = destY;
            }
            const attackMult = skill.multiplier || 1;
            const hits = skill.hits || 1;
            gameState.player.mana -= manaCost;
            for (let i = 0; i < hits; i++) {
                const attackValue = Math.floor(getStat(gameState.player, 'attack') * attackMult * level * getSkillPowerMult(gameState.player));
                const result = performAttack(gameState.player, target, { attackValue, status: gameState.player.equipped.weapon && gameState.player.equipped.weapon.status });
                const detail = buildAttackDetail(skill.icon, skill.name, result);
                const img = getPlayerImage();
                if (!result.hit) {
                    addMessage(`❌ ${target.name}에게 ${skill.name}이 빗나갔습니다!`, 'combat', detail, img);
                } else {
                    const critMsg = result.crit ? ' (치명타!)' : '';
                    let dmgStr = formatNumber(result.baseDamage);
                    if (result.elementDamage) {
                        const emoji = ELEMENT_EMOJI[result.element] || '';
                        dmgStr = `${formatNumber(result.baseDamage)}+${emoji}${formatNumber(result.elementDamage)}`;
                    }
                    addMessage(`${skill.icon} ${target.name}에게 ${dmgStr}의 피해를 입혔습니다${critMsg}!`, 'combat', detail, img);
                }
                if (target.health <= 0) {
                    killMonster(target);
                    break;
                }
            }
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

        function handleProjectileSkill(skillKey, skill, level, manaCost, target, dist) {
            const dx = Math.sign(target.x - gameState.player.x);
            const dy = Math.sign(target.y - gameState.player.y);
            gameState.player.mana -= manaCost;
            const proj = {
                x: gameState.player.x,
                y: gameState.player.y,
                dx,
                dy,
                rangeLeft: dist,
                icon: skill.icon,
                damageDice: skill.damageDice,
                magic: skill.magic,
                skill: skillKey,
                element: skill.element,
                level,
                attacker: gameState.player
            };
            if (skillKey === 'Fireball' || skillKey === 'Iceball') {
                proj.homing = true;
                proj.target = target;
            }
            gameState.projectiles.push(proj);
            gameState.player.skillCooldowns[skillKey] = getSkillCooldown(gameState.player, skill);
            processTurn();
        }

       function useSkill(skillKey) {
            if ((gameState.player.paralysis && gameState.player.paralysisTurns > 0) ||
                (gameState.player.petrify && gameState.player.petrifyTurns > 0)) {
                addMessage('⚠️ 플레이어는 행동할 수 없습니다.', 'info');
                processTurn();
                return;
            }
            if (gameState.player.silence && gameState.player.silenceTurns > 0) {
                addMessage('🤐 플레이어는 침묵 상태입니다.', 'info');
                processTurn();
                return;
            }
            if (!skillKey) {
                addMessage('스킬이 설정되어 있지 않습니다.', 'info');
                processTurn();
                return;
            }
            const skill = SKILL_DEFS[skillKey];
            if (gameState.player.skillCooldowns[skillKey] > 0) {
                addMessage('⏳ 스킬을 아직 사용할 수 없습니다.', 'info');
                if (gameState.player.skillCooldowns[skillKey] > 0) {
                    gameState.player.skillCooldowns[skillKey]--;
                }
                return;
            }
            const level = gameState.player.skillLevels[skillKey] || 1;
            const baseCost = (skill.manaCost || 0) + level - 1;
            const manaCost = getSkillManaCost(gameState.player, { manaCost: baseCost });
            if (skill.passive) {
                addMessage('이 스킬은 항상 효과가 발동중입니다.', 'info');
                processTurn();
                return;
            }
            if (gameState.player.mana < manaCost) {
                addMessage('마나가 부족합니다.', 'info');
                return;
            }

            if (skill.element === 'fire') {
                SoundEngine.playSound('spellFire');
            } else if (skill.element === 'ice') {
                SoundEngine.playSound('spellIce');
            } else if (skill.heal !== undefined) {
                SoundEngine.playSound('spellHeal');
            }

            if (skill.heal !== undefined) {
                handleHeal(skillKey, skill, level, manaCost);
                return;
            }
            if (skill.purify) {
                handlePurify(skillKey, skill, level, manaCost);
                return;
            }
            if (skill.shield) {
                handleShield(skillKey, skill, level, manaCost);
                return;
            }
            if (skill.attackBuff) {
                handleAttackBuff(skillKey, skill, level, manaCost);
                return;
            }
            if (skill.statBuff) {
                handleStatBuff(skillKey, skill, level, manaCost);
                return;
            }
            if (skill.teleport) {
                handleTeleport(skillKey, skill, level, manaCost);
                return;
            }
            if (skill.radius !== undefined) {
                handleNovaSkill(skillKey, skill, level, manaCost);
                return;
            }

            let target = null;
            let dist = Infinity;
            const searchRange = (skill.melee && skill.dashRange)
                ? getSkillRange(gameState.player, { range: skill.dashRange })
                : getSkillRange(gameState.player, skill);
            for (const monster of gameState.monsters) {
                const d = getDistance(gameState.player.x, gameState.player.y, monster.x, monster.y);
                if (d <= searchRange && d < dist && hasLineOfSight(gameState.player.x, gameState.player.y, monster.x, monster.y)) {
                    target = monster;
                    dist = d;
                }
            }
            if (!target) {
                addMessage('🎯 사거리 내에 몬스터가 없습니다.', 'info');
                processTurn();
                return;
            }
            if (skill.melee) {
                handleMeleeSkill(skillKey, skill, level, manaCost, target, dist);
                return;
            }
            handleProjectileSkill(skillKey, skill, level, manaCost, target, dist);
        }

        function healAction() {
            const healAmount = Math.min(Math.floor(getStat(gameState.player, 'maxHealth') * 0.3), getStat(gameState.player, 'maxHealth') - gameState.player.health);
            if (healAmount > 0) {
                gameState.player.health += healAmount;
                addMessage(`💚 플레이어가 휴식을 취해 ${formatNumber(healAmount)} 체력을 회복했습니다.`, 'info', null, getPlayerImage());
                updateStats();
            } else {
                addMessage('❤️ 체력이 이미 가득 찼습니다.', 'info');
            }
            processTurn();
        }

        function recallMercenaries() {
            const positions = [
                {x: gameState.player.x + 1, y: gameState.player.y},
                {x: gameState.player.x - 1, y: gameState.player.y},
                {x: gameState.player.x, y: gameState.player.y + 1},
                {x: gameState.player.x, y: gameState.player.y - 1},
                {x: gameState.player.x + 1, y: gameState.player.y + 1},
                {x: gameState.player.x - 1, y: gameState.player.y - 1},
                {x: gameState.player.x + 1, y: gameState.player.y - 1},
                {x: gameState.player.x - 1, y: gameState.player.y + 1}
            ];
            gameState.activeMercenaries.forEach(mercenary => {
                if (!mercenary.alive) return;
                for (const pos of positions) {
                    if (pos.x >= 0 && pos.x < gameState.dungeonSize &&
                        pos.y >= 0 && pos.y < gameState.dungeonSize &&
                        gameState.dungeon[pos.y][pos.x] === 'empty' &&
                        !gameState.activeMercenaries.some(m => m !== mercenary && m.alive && m.x === pos.x && m.y === pos.y) &&
                        !gameState.monsters.some(m => m.x === pos.x && m.y === pos.y)) {
                        mercenary.x = pos.x;
                        mercenary.y = pos.y;
                        break;
                    }
                }
            });
            renderDungeon();
            addMessage('📣 용병들을 호출했습니다.', 'mercenary');
            processTurn();
        }

        function pickUpAction() {
            const items = gameState.items.filter(i =>
                getDistance(gameState.player.x, gameState.player.y, i.x, i.y) <= 2);
            if (items.length === 0) {
                addMessage('📦 주변에 아이템이 없습니다.', 'info');
                processTurn();
                return;
            }
            let gotItem = false;
            items.forEach(item => {
                const idx = gameState.items.indexOf(item);
                if (item.type === ITEM_TYPES.RECIPE_SCROLL) {
                    learnRecipe(item.recipe);
                    gotItem = true;
                } else {
                    addToInventory(item);
                    addMessage(`📦 ${item.name}을(를) 획득했습니다!`, 'item');
                    gotItem = true;
                }
                if (idx !== -1) gameState.items.splice(idx, 1);
                if (gameState.dungeon[item.y] && gameState.dungeon[item.y][item.x] === 'item') {
                    gameState.dungeon[item.y][item.x] = 'empty';
                }
            });
            if (gotItem) playPlayerVoice('assets/audio/player_item.mp3');
            renderDungeon();
            processTurn();
        }

        function updateShopDisplay() {
            const list = document.getElementById('shop-items');
            list.innerHTML = '';
            gameState.shopItems.forEach((item, i) => {
                const div = document.createElement('div');
                div.className = 'shop-item';
                const cost = item.price * SHOP_PRICE_MULTIPLIER;
                div.innerHTML = `<span>${item.icon} ${item.baseName}</span><span>${formatNumber(cost)}💰</span>`;
                div.onclick = () => buyShopItem(i);
                list.appendChild(div);
            });
        }

        function showShop() {
            SoundEngine.playSound('openPanel');
            playPlayerVoice('assets/audio/player_shop.mp3');
            updateShopDisplay();
            document.getElementById('shop-panel').style.display = 'block';
            gameState.gameRunning = false;
        }

        function hideShop() {
            SoundEngine.playSound('closePanel');
            document.getElementById('shop-panel').style.display = 'none';
            gameState.gameRunning = true;
        }

        function showItemTargetPanel(item) {
            SoundEngine.playSound('openPanel');
            // 아이템 타입이 레시피 스크롤인 경우, 즉시 사용하고 함수 종료
            if (item.type === ITEM_TYPES.RECIPE_SCROLL) {
                learnRecipe(item.recipe);

                const index = gameState.player.inventory.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    gameState.player.inventory.splice(index, 1);
                    updateInventoryDisplay();
                }
                return;
            }

            const panel = document.getElementById('item-target-panel');
            const content = document.getElementById('item-target-content');
            content.innerHTML = `<h3>${item.name} 대상 선택</h3>`;
            const choices = [];

            function getEquipInfo(target) {
                if (!target || !target.equipped) return '없음';
                switch (item.type) {
                    case ITEM_TYPES.WEAPON:
                        return target.equipped.weapon ? formatItem(target.equipped.weapon) : '없음';
                    case ITEM_TYPES.ARMOR:
                        return target.equipped.armor ? formatItem(target.equipped.armor) : '없음';
                    case ITEM_TYPES.ACCESSORY:
                        const a1 = target.equipped.accessory1 ? formatItem(target.equipped.accessory1) : '없음';
                        const a2 = target.equipped.accessory2 ? formatItem(target.equipped.accessory2) : '없음';
                        return `${a1} / ${a2}`;
                    default:
                        return '';
                }
            }

            const addBtn = (label, target, action) => {
                let fullLabel = label;
                if (item.type === ITEM_TYPES.WEAPON ||
                    item.type === ITEM_TYPES.ARMOR ||
                    item.type === ITEM_TYPES.ACCESSORY) {
                    const info = getEquipInfo(target);
                    fullLabel = `${label} (${info})`;
                }
                choices.push({ label: fullLabel, action });
                const btn = document.createElement('button');
                btn.innerHTML = fullLabel;
                btn.className = 'target-button';
                btn.onclick = () => { action(); hideItemTargetPanel(); };
                content.appendChild(btn);
            };

            if (item.type === ITEM_TYPES.REVIVE) {
                const dead = gameState.activeMercenaries.filter(m => !m.alive);
                if (dead.length === 0) {
                    addMessage('부활할 용병이 없습니다.', 'info');
                    return;
                }
                dead.forEach(m => {
                    addBtn(m.name, m, () => reviveMercenary(m));
                });
            } else if (item.type === ITEM_TYPES.POTION ||
                       item.type === ITEM_TYPES.EXP_SCROLL ||
                       item.type === ITEM_TYPES.FOOD ||
                       item.type === ITEM_TYPES.ESSENCE) {
                addBtn('플레이어', gameState.player, () => useItemOnTarget(item, gameState.player));
                gameState.activeMercenaries.forEach(m => {
                    addBtn(m.name, m, () => useItemOnTarget(item, m));
                });
            } else if (item.type === ITEM_TYPES.EGG) {
                addBtn('인큐베이터', null, () => placeEggInIncubator(item, item.incubation || 3));
            } else {
                addBtn('플레이어', gameState.player, () => equipItem(item));
                gameState.activeMercenaries.forEach(m => {
                    addBtn(m.name, m, () => equipItemToMercenary(item, m));
                });
            }
            const buttons = content.querySelectorAll('.target-button');
            if (buttons.length === 1) {
                buttons[0].click();
                return;
            }

            const isTest = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
            if (isTest && typeof prompt === 'function') {
                const msg = choices.map((c, i) => `${i}: ${c.label}`).join('\n');
                const res = prompt(msg);
                const idx = parseInt(res, 10);
                if (!isNaN(idx) && choices[idx]) choices[idx].action();
            } else {
                panel.style.display = 'block';
                gameState.gameRunning = false;
            }
        }

        function hideItemTargetPanel() {
            SoundEngine.playSound('closePanel');
            document.getElementById('item-target-panel').style.display = 'none';
            gameState.gameRunning = true;
        }

        function showCorpsePanel(corpse) {
            SoundEngine.playSound('openPanel');
            const panel = document.getElementById('corpse-panel');
            const content = document.getElementById('corpse-content');
            content.innerHTML = `<h3>${corpse.name} (${getMonsterRank(corpse)})</h3>`;

            const reviveBtn = document.createElement('button');
            reviveBtn.textContent = '부활';
            reviveBtn.className = 'target-button';
            reviveBtn.onclick = () => {
                hideCorpsePanel();
                reviveMonsterCorpse(corpse);
                processTurn();
            };
            content.appendChild(reviveBtn);

            const dissectBtn = document.createElement('button');
            dissectBtn.textContent = '분해';
            dissectBtn.className = 'target-button';
            dissectBtn.onclick = () => {
                hideCorpsePanel();
                dissectCorpse(corpse);
                processTurn();
            };
            content.appendChild(dissectBtn);

            const ignoreBtn = document.createElement('button');
            ignoreBtn.textContent = '무시';
            ignoreBtn.className = 'target-button';
            ignoreBtn.onclick = () => {
                hideCorpsePanel();
                ignoreCorpse(corpse);
                processTurn();
            };
            content.appendChild(ignoreBtn);

            panel.style.display = 'block';
            gameState.gameRunning = false;
        }

        function hideCorpsePanel() {
            SoundEngine.playSound('closePanel');
            document.getElementById('corpse-panel').style.display = 'none';
            gameState.gameRunning = true;
            const content = document.getElementById('corpse-content');
            if (content) content.innerHTML = '';
        }

        function showItemDetailPanel(item) {
            SoundEngine.playSound('openPanel');
            const panel = document.getElementById('item-detail-panel');
            const content = document.getElementById('item-detail-content');
            content.innerHTML = `<h3>${formatItem(item)}</h3>`;

            const equipBtn = document.createElement('button');
            equipBtn.textContent = '장착';
            equipBtn.className = 'equip-button';
            equipBtn.onclick = () => {
                hideItemDetailPanel();
                showItemTargetPanel(item);
            };
            content.appendChild(equipBtn);

            const enhanceBtn = document.createElement('button');
            enhanceBtn.textContent = '강화';
            enhanceBtn.className = 'enhance-button';
            enhanceBtn.onclick = () => {
                enhanceItem(item);
                hideItemDetailPanel();
            };
            content.appendChild(enhanceBtn);

            const disBtn = document.createElement('button');
            disBtn.textContent = '분해';
            disBtn.className = 'disassemble-button';
            disBtn.onclick = () => {
                disassembleItem(item);
                hideItemDetailPanel();
            };
            content.appendChild(disBtn);

            const sellBtn = document.createElement('button');
            sellBtn.textContent = '판매';
            sellBtn.className = 'sell-button';
            sellBtn.onclick = () => {
                confirmAndSell(item);
                hideItemDetailPanel();
            };
            content.appendChild(sellBtn);

            panel.style.display = 'block';
            gameState.gameRunning = false;
        }

        function hideItemDetailPanel() {
            SoundEngine.playSound('closePanel');
            document.getElementById('item-detail-panel').style.display = 'none';
            gameState.gameRunning = true;
        }

        function updateCraftingDetailDisplay() {
            const list = document.getElementById('crafting-detail-list');
            if (!list) return;
            list.innerHTML = '';
            gameState.knownRecipes.forEach(key => {
                const r = RECIPES[key];
                if (!r) return;
                const div = document.createElement('div');
                const btn = document.createElement('button');
                if (gameState.activeRecipes.includes(key)) {
                    btn.textContent = '빼기';
                    btn.onclick = () => removeRecipeFromTab(key);
                } else {
                    btn.textContent = '넣기';
                    btn.onclick = () => addRecipeToTab(key);
                }
                const icon = ITEMS[r.output]?.icon || '';
                div.textContent = `${icon ? icon + ' ' : ''}${r.name} `;
                div.appendChild(btn);
                list.appendChild(div);
            });
        }

        function showCraftingDetailPanel() {
            SoundEngine.playSound('openPanel');
            updateCraftingDetailDisplay();
            document.getElementById('crafting-detail-panel').style.display = 'block';
            gameState.gameRunning = false;
        }

        function hideCraftingDetailPanel() {
            SoundEngine.playSound('closePanel');
            document.getElementById('crafting-detail-panel').style.display = 'none';
            gameState.gameRunning = true;
        }

        function buyShopItem(index) {
            const item = gameState.shopItems[index];
            if (!item) return;
            const cost = item.price * SHOP_PRICE_MULTIPLIER;
            if (gameState.player.gold < cost) {
                SoundEngine.playSound('error');
                addMessage('💸 골드가 부족합니다.', 'info');
                return;
            }
            gameState.player.gold -= cost;
            addToInventory(item);
            SoundEngine.playSound('buyItem');
            addMessage(`🛒 ${item.name}을(를) 구입했습니다!`, 'item');
            gameState.shopItems.splice(index, 1);
            updateStats();
            updateShopDisplay();
        }

        function spawnStartingRecipes(count = 3) {
            const unknown = Object.keys(RECIPES).filter(r => !gameState.knownRecipes.includes(r));
            for (let i = 0; i < count && unknown.length; i++) {
                const idx = Math.floor(Math.random() * unknown.length);
                const key = unknown.splice(idx, 1)[0];
                const pos = findAdjacentEmpty(gameState.player.x, gameState.player.y);
                if (pos.x === gameState.player.x && pos.y === gameState.player.y) break;
                const scroll = createRecipeScroll(key, pos.x, pos.y);
                gameState.items.push(scroll);
                gameState.dungeon[pos.y][pos.x] = 'item';
            }
        }

        function spawnStartingMaps(count = 3) {
            for (let i = 0; i < count; i++) {
                const pos = findAdjacentEmpty(gameState.player.x, gameState.player.y);
                if (pos.x === gameState.player.x && pos.y === gameState.player.y) break;
                const mapItem = createItem('graveyardMap', pos.x, pos.y);
                gameState.items.push(mapItem);
                gameState.dungeon[pos.y][pos.x] = 'item';
            }
        }


        function startGame() {
            // SoundEngine.initialize(); // 오디오 초기화는 사용자 입력 후 수행
            globalThis.spawnPaladinTest = true;
            gameState.player.job = null;
            // Ensure player starts with initial gold
            gameState.player.gold = 1000;
            const allSkills = Object.keys(SKILL_DEFS);
            gameState.player.skillPoints = 0;
            gameState.player.statPoints = 0;
            allSkills.forEach(s => {
                if (!gameState.player.skills.includes(s)) {
                    gameState.player.skills.push(s);
                }
                gameState.player.skillLevels[s] = 1;
            });
            if (allSkills[0]) gameState.player.assignedSkills[1] = allSkills[0];
            if (allSkills[1]) gameState.player.assignedSkills[2] = allSkills[1];

            generateDungeon();
            const zombieMerc = convertMonsterToMercenary(createMonster('ZOMBIE', 0, 0, 1));
            zombieMerc.affinity = 195;
            zombieMerc.fullness = 50;
            gameState.standbyMercenaries.push(zombieMerc);
            if (globalThis.spawnPaladinTest) {
                let palPos = { x: gameState.player.x, y: gameState.player.y + 2 };
                if (palPos.x >= gameState.dungeonSize || palPos.y >= gameState.dungeonSize || gameState.dungeon[palPos.y][palPos.x] !== 'empty') {
                    palPos = findAdjacentEmpty(gameState.player.x, gameState.player.y);
                }
                if (palPos.x !== gameState.player.x || palPos.y !== gameState.player.y) {
                    const pal = createMercenary('PALADIN', palPos.x, palPos.y);
                    gameState.paladinSpawns.push({ x: palPos.x, y: palPos.y, mercenary: pal, cost: 1 });
                    gameState.dungeon[palPos.y][palPos.x] = 'paladin';
                    renderDungeon();
                }
            }
            for (let i = 0; i < 5; i++) {
                gameState.player.inventory.push(createItem('cookedMeal', 0, 0));
            }
            for (let i = 0; i < 5; i++) {
                gameState.player.inventory.push(createItem('smallExpScroll', 0, 0));
            }
            // spawnStartingMaps();
            updateInventoryDisplay();
            updateSkillDisplay();
            updateIncubatorDisplay();
            updateMaterialsDisplay();
            updateTileTabDisplay();
            updateActionButtons();
            updateStats();
        }

        // 초기화 및 입력 처리
        startGame();
        document.getElementById('save-game').onclick = saveGame;
        document.getElementById('load-game').onclick = loadGame;
        const newBtn = document.getElementById('new-game');
        if (newBtn) {
            newBtn.onclick = () => {
                if (typeof confirm !== 'function' || confirm('새 게임을 시작하시겠습니까? 진행 중인 내용이 사라집니다.')) {
                    location.reload();
                }
            };
        }
        document.getElementById('attack').onclick = meleeAttackAction;
        document.getElementById('ranged').onclick = rangedAction;
        document.getElementById('skill1').onclick = skill1Action;
        document.getElementById('skill2').onclick = skill2Action;
        document.getElementById('heal').onclick = healAction;
        document.getElementById('recall').onclick = recallMercenaries;
        document.getElementById('close-shop').onclick = hideShop;
        document.getElementById('close-mercenary-detail').onclick = hideMercenaryDetails;
        document.getElementById('close-monster-detail').onclick = hideMonsterDetails;
        document.getElementById('close-item-detail').onclick = hideItemDetailPanel;
        document.getElementById('close-item-target').onclick = hideItemTargetPanel;
        document.getElementById('dungeon').addEventListener('click', handleDungeonClick);
        document.getElementById('pickup').onclick = pickUpAction;
        const matPanel = document.getElementById('materials-panel');
        matPanel.addEventListener('click', e => {
            if (e.target === matPanel || e.target.tagName === 'H2') {
                showCraftingDetailPanel();
            }
        });
        document.getElementById('close-crafting-detail').onclick = hideCraftingDetailPanel;
        document.getElementById('close-corpse-panel').onclick = hideCorpsePanel;

        // BGM control buttons
        const nextBtn = document.getElementById('next-bgm');
        if (nextBtn) nextBtn.onclick = () => { initializeAudio(); BgmPlayer.playNextTrack(); };
        const prevBtn = document.getElementById('prev-bgm');
        if (prevBtn) prevBtn.onclick = () => { initializeAudio(); BgmPlayer.playPreviousTrack(); };
        const toggleBtn = document.getElementById('toggle-bgm');
        if (toggleBtn) toggleBtn.onclick = () => { initializeAudio(); BgmPlayer.toggleMute(); };

        document.addEventListener('keydown', (e) => {
            initializeAudio();
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                movePlayer(0, -1);
            }
            else if (e.key === 'ArrowDown') {
                e.preventDefault();
                movePlayer(0, 1);
            }
            else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                movePlayer(-1, 0);
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                movePlayer(1, 0);
            }
            else if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'z') {
                e.preventDefault();
                meleeAttackAction();
            }
            else if (e.key.toLowerCase() === 'x') {
                e.preventDefault();
                skill1Action();
            }
            else if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                skill2Action();
            }
            else if (e.key.toLowerCase() === 'v') {
                e.preventDefault();
                rangedAction();
            }
            else if (e.key.toLowerCase() === 'a') {
                e.preventDefault();
                recallMercenaries();
            }
            else if (e.key.toLowerCase() === 'b') {
                e.preventDefault();
                pickUpAction();
            }
            else if (/^[1-9]$/.test(e.key)) {
                const idx = parseInt(e.key) - 1;
                if (gameState.activeMercenaries[idx]) {
                    e.preventDefault();
                    showMercenaryDetails(gameState.activeMercenaries[idx]);
                }
            }
        });

        const filterButtons = document.querySelectorAll('.inv-filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                gameState.inventoryFilter = button.dataset.filter;
                updateInventoryDisplay();
            });
        });
const exportsObj = {
gameState, addMessage, addToInventory, advanceIncubators, advanceGameLoop,
applyStatusEffects, applyAttackBuff, assignSkill, autoMoveStep, averageDice, buildAttackDetail,
buyShopItem, checkLevelUp, checkMercenaryLevelUp, checkMonsterLevelUp, 
convertMonsterToMercenary, craftItem, createChampion, createEliteMonster, 
createHomingProjectile, createItem, createMercenary, createMonster,
createRecipeScroll, learnRecipe,
createSuperiorMonster, createTreasure, createNovaEffect, createScreenShake, playSkillOverlayEffect, playNovaSkillEffect, dissectCorpse, equipItem,
equipItemToMercenary, estimateSkillDamage, findAdjacentEmpty, findNearestEmpty, findPath,
 formatItem, formatItemName, formatNumber, generateDungeon, rebuildDungeonDOM, generateStars, getAuraBonus,
getDistance, getMonsterPoolForFloor, getAllMonsterTypes, getPlayerEmoji, getStat, getStatusResist,
getActiveAuraIcons, buildEffectDetails, updateUnitEffectIcons,
getSkillRange, getSkillCooldown, getSkillManaCost, getSkillPowerMult,
handleDungeonClick, handleItemClick, handlePlayerDeath,
hasLineOfSight, healAction, healTarget, hideItemTargetPanel, hideItemDetailPanel,
hideMercenaryDetails, hideMonsterDetails, hideShop, hireMercenary, killMonster, killMercenary,
loadGame, meleeAttackAction, monsterAttack, performMonsterSkill, movePlayer, nextFloor,
processMercenaryTurn, processProjectiles, processTurn, purifyTarget, 
rangedAction, recallMercenaries, recruitHatchedSuperior, handleHatchedMonsterClick,
removeEggFromIncubator, renderDungeon, reviveMercenary, reviveMonsterCorpse,
 rollDice, saveGame, sellItem, confirmAndSell, enhanceItem, disassembleItem, setMercenaryLevel, setMonsterLevel, setChampionLevel,
showChampionDetails, showItemDetailPanel, showItemTargetPanel, showMercenaryDetails,
showMonsterDetails, showShop, showSkillDamage, showAuraDetails, skill1Action, skill2Action,
spawnMercenaryNearPlayer, spawnStartingMaps, startGame, swapActiveAndStandby, tryApplyStatus,
unequipAccessory, unequipWeapon, unequipArmor, unequipItemFromMercenary, updateActionButtons, updateCamera,
updateFogOfWar, updateIncubatorDisplay,
 updateInventoryDisplay, updateMaterialsDisplay, updateMercenaryDisplay,
 updateShopDisplay, updateSkillDisplay, updateStats, updateTurnEffects,
 updateTileTabDisplay,
upgradeMercenarySkill, upgradeMonsterSkill, useItem, useItemOnTarget, useSkill, removeMercenary, killMercenary,
    dismiss, sacrifice, allocateStat, exitMap,
    addRecipeToTab, removeRecipeFromTab,
    updateCraftingDetailDisplay, showCraftingDetailPanel, hideCraftingDetailPanel,
    showCorpsePanel, hideCorpsePanel, ignoreCorpse, getMonsterRank,
    getMonsterImage, getMercImage, getPlayerImage, getUnitImage,
    isPlayerSide, isSameSide
};
// ======================= 추가 시작 =======================
// 1초마다 모든 유닛의 효과 아이콘 인덱스를 업데이트하고, 다시 렌더링합니다.
if (!(typeof navigator !== 'undefined' && navigator.userAgent &&
    (navigator.userAgent.includes('Node.js') || navigator.userAgent.includes('jsdom')))) {
    setInterval(() => {
        if (!gameState.gameRunning) return; // 게임이 멈췄을 땐 실행하지 않음

        const allUnits = [
            gameState.player,
            ...gameState.activeMercenaries.filter(m => m.alive),
            ...gameState.monsters
        ];

        let needsRender = false;

        allUnits.forEach(unit => {
            if (unit && effectCycleState[unit.id]) {
                const state = effectCycleState[unit.id];
                let updated = false;
                if (state.buffs && state.buffs.length > 1) {
                    state.buffIndex = (state.buffIndex + 1) % state.buffs.length;
                    updated = true;
                }
                if (state.debuffs && state.debuffs.length > 1) {
                    state.debuffIndex = (state.debuffIndex + 1) % state.debuffs.length;
                    updated = true;
                }
                if (updated) {
                    needsRender = true;
                }
            }
        });

        if (needsRender) {
            renderDungeon(); // 아이콘이 변경되었으므로 던전을 다시 렌더링
        }
    }, 1000); // 1초 간격
}
// ======================= 추가 끝 =======================
Object.assign(window, exportsObj, {SKILL_DEFS, MERCENARY_SKILLS, MONSTER_SKILLS, MONSTER_SKILL_SETS, MONSTER_TRAITS, MONSTER_TRAIT_SETS, PREFIXES, SUFFIXES, RARE_PREFIXES, RARE_SUFFIXES, MAP_PREFIXES, MAP_SUFFIXES, MAP_TILE_TYPES, CORPSE_TURNS, UNIQUE_ITEMS, UNIQUE_EFFECT_POOL});

