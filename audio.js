const book = {
    title: "L'enfant et le béluga",
    author: "Gaétane Saint-Cyr",
    cover_art:
        "https://lenfantetlebeluga.com/lenfantetlebeluga.jpeg",
    info: [
        'Lenfant et le béluga',
    ],
    chapters: [
        {
            name: "L'enfant et le béluga",
            link: "https://raw.githubusercontent.com/gsaintcyr/lenfantetlebeluga/refs/heads/core/Lenfant_et_le_b%C3%A9luga_Kamouska.mp3",
            reader: "Eve Landry",
            duration: "00:48:43"
        },
    ]
};

Vue.component("spectrum", {
    template: "#spectrum-template",
    props: ["pins"],
    data: function () {
        return {
            radius: 50,
            adjust: 0,
            avarage: 0,
            cover_art: null
        };
    },
    mounted: function () {
        const width = this.$el.getBoundingClientRect().width;
        const innerWidth = (width * 100) / 130;
        this.adjust = (width - innerWidth) / 2;
        this.radius = innerWidth / 2;
        

    },
    methods: {
        valueToPoint: function (value, index) {
            let angle = (360 * index) / this.total - 90;

            // convert to radians
            angle = (angle * Math.PI) / 180;

            var cos =
                Math.cos(angle) * (this.radius + value) + this.radius + this.adjust;
            var sin =
                Math.sin(angle) * (this.radius + value) + this.radius + this.adjust;
            return `${cos},${sin}`;
        }
    },
    computed: {
        points: function () {
            let avarage_count = 0;
            const retn = this.pins
                .map((p, index) => {
                    avarage_count += p;
                    return this.valueToPoint(p, index);
                })
                .join(" ");
            this.$emit("avarage", avarage_count / this.total);

            return retn;
        },
        total: function () {
            return this.pins.length;
        }
    }
});

new Vue({
    el: "#app",
    data: {
        handle_clicked: false,
        handle_position: 0,
        isInitializing: true,
        animationFrameId: null,
        audioContext: null,
        bar: null,
        is_playing: false,
        is_loading: true,
        is_error: false,
        error_timeout: null,
        error_msg: "",
        audio_obj: null,
        audio_index: 0,
        duration: 0,
        current_time: 0,
        audio_pins: [],
        analyser: null,
        data_array: [],
        buffered: [],
        speed: 1,
        repeat: false,
        repeat_count: 0,
        list_play: false,
        show_list: false,
        book: book,
        show_info: false,
        cover_art_avarage: 0
    },
    mounted: function () {
        this.bar = this.$refs.bar.getBoundingClientRect();
        let handle = this.$refs.handle;

        document.addEventListener("pointerup", () => { this.handle_clicked = false; });
        document.addEventListener("pointercancel", () => { this.handle_clicked = false; });
        document.addEventListener("pointermove", this.moveHandler);

        window.addEventListener("resize", this.resizeHandler);

        // Initialiser le lecteur après avoir installé les écouteurs d'événements.
        let savedTime = null;
        let savedChapter = null;
        try {
            savedTime = localStorage.getItem("audiobookTime");
            savedChapter = localStorage.getItem("audiobookChapter");
        } catch (error) {
            // Le lecteur reste fonctionnel même si le stockage local est indisponible.
        }

        const parsedSavedChapter = Number.parseInt(savedChapter, 10);
        const hasSavedChapter = Number.isInteger(parsedSavedChapter) &&
            parsedSavedChapter >= 0 && parsedSavedChapter < this.book.chapters.length;
        if (hasSavedChapter) this.audio_index = parsedSavedChapter;

        this.audio_obj = new Audio();
        this.audio_obj.crossOrigin = "anonymous";
        this.audio_obj.preload = "metadata";
        this.audio_obj.src = this.book.chapters[this.audio_index].link;

        this.audio_obj.addEventListener("timeupdate", () => {
            this.current_time = Number.isFinite(this.audio_obj.currentTime) ? this.audio_obj.currentTime : 0;
            try {
                localStorage.setItem("audiobookTime", String(this.current_time));
                localStorage.setItem("audiobookChapter", String(this.audio_index));
                localStorage.setItem("audiobookTime-" + this.audio_index, String(this.current_time));
            } catch (error) {
                // L'écoute continue sans sauvegarde si le navigateur bloque localStorage.
            }
        });

        this.audio_obj.addEventListener("loadedmetadata", () => {
            this.duration = Number.isFinite(this.audio_obj.duration) ? this.audio_obj.duration : 0;
            this.is_loading = false;

            let chapterTime = null;
            try {
                chapterTime = localStorage.getItem("audiobookTime-" + this.audio_index);
            } catch (error) {}

            // Compatibilité avec l'ancienne sauvegarde, qui ne gérait qu'une seule position.
            if (chapterTime === null && hasSavedChapter && this.audio_index === parsedSavedChapter) {
                chapterTime = savedTime;
            }

            const resumeAt = Number.parseFloat(chapterTime);
            if (Number.isFinite(resumeAt) && resumeAt > 0 && this.duration > 0 &&
                resumeAt < this.duration - 1 && this.audio_obj.currentTime < 0.5) {
                this.audio_obj.currentTime = resumeAt;
                this.current_time = resumeAt;
            }
        });

        this.audio_obj.addEventListener("loadeddata", () => {
            this.duration = Number.isFinite(this.audio_obj.duration) ? this.audio_obj.duration : 0;
        });

        this.audio_obj.addEventListener("ended", this.onEnded);
        this.audio_obj.addEventListener("progress", this.onProgress);
        this.audio_obj.addEventListener("loadedmetadata", this.onProgress);
        this.audio_obj.addEventListener("playing", () => {
            this.is_playing = true;
            this.is_loading = false;
            if (this.analyser && this.animationFrameId === null) {
                this.animationFrameId = requestAnimationFrame(this.timeUpdated);
            }
        });
        this.audio_obj.addEventListener("pause", () => {
            this.is_playing = false;
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        });
        this.audio_obj.addEventListener("canplay", () => {
            this.is_loading = false;
        });
        this.audio_obj.addEventListener("seeking", () => {
            this.is_loading = true;
        });
        this.audio_obj.addEventListener("seeked", () => {
            this.is_loading = false;
            this.current_time = this.audio_obj.currentTime || 0;
        });
        this.audio_obj.onerror = this.onError;
        this.audio_obj.load();
        this.$nextTick(() => { this.isInitializing = false; });
    },
    methods: {
        onError: function () {
            const audioError = this.audio_obj && this.audio_obj.error;
            let msg = audioError ? (audioError.code + ": " + (audioError.message || "Erreur de lecture")) :
                "Impossible de charger le fichier audio.";
            console.error("ERROR", msg);
            this.is_error = true;
            this.error_msg = msg;

            this.is_playing = false;
            this.is_loading = false;

            clearTimeout(this.error_timeout);
            this.error_timeout = setTimeout(() => {
                this.is_error = false;
                this.error_msg = "";
            }, 3500);
        },
        onEnded: function (event) {
            this.audio_obj.currentTime = 0;
            if (this.repeat && this.repeat_count < 1) {
                this.audio_obj.play();
                this.repeat_count = this.repeat_count + 1;
                return;
            }

            if (this.repeat_count == 1) {
                this.repeat_count = 0;
            }

            if (this.list_play) {
                const newIndex = this.audio_index + 1;
                if (newIndex < this.book.chapters.length) this.audio_index = newIndex;

                return;
            }

            this.is_playing = false;
            this.repeat = false;
        },
        onProgress: function (e) {
            if (!Number.isFinite(this.duration) || this.duration <= 0 || !this.audio_obj) {
                this.buffered = [];
                return;
            }
            const oneSecond = 100 / this.duration;
            const ranges = [];
            for (var i = 0; i < this.audio_obj.buffered.length; i++) {
                const start = this.audio_obj.buffered.start(i);
                const end = this.audio_obj.buffered.end(i);

                const position = {};
                position.left = oneSecond * start + "%";
                position.width = oneSecond * (end - start) + "%";

                ranges.push(position);
            }

            this.buffered = ranges;
        },
        updateAvarage: function (event) {
            this.cover_art_avarage = event;
        },
        timeUpdated: function () {
            if (!this.audio_obj || this.audio_obj.paused || !this.analyser || !this.data_array.length) {
                this.animationFrameId = null;
                return;
            }

            this.current_time = Number.isFinite(this.audio_obj.currentTime) ? this.audio_obj.currentTime : 0;
            this.analyser.getByteTimeDomainData(this.data_array);
            this.audio_pins = Array.from(this.data_array);
            this.animationFrameId = requestAnimationFrame(this.timeUpdated);
        },
        playNext: function () {
            const newIndex = this.audio_index + 1;

            if (newIndex >= this.book.chapters.length) return;

            this.audio_index = newIndex;
        },
        playPrev: function () {
            const newIndex = this.audio_index - 1;

            if (newIndex < 0) return;
            this.audio_index = newIndex;
        },
        initAnalyser: function () {
            if (this.analyser || !this.audio_obj) return;

            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return;

                this.audioContext = new AudioContextClass();
                this.analyser = this.audioContext.createAnalyser();
                const audioSrc = this.audioContext.createMediaElementSource(this.audio_obj);

                this.analyser.minDecibels = -90;
                this.analyser.maxDecibels = -10;
                this.analyser.smoothingTimeConstant = 0.75;
                this.analyser.fftSize = 128;
                audioSrc.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);

                this.data_array = new Uint8Array(this.analyser.frequencyBinCount);
                if (this.audioContext.state === "suspended") this.audioContext.resume().catch(function () {});
            } catch (error) {
                // L'animation est facultative : l'audio doit fonctionner même sans analyseur.
                this.analyser = null;
                this.data_array = [];
            }
        },
        playAudio: function () {
            if (!this.audio_obj) return;

            if (this.is_playing) {
                this.audio_obj.pause();
                return;
            }

            this.initAnalyser();
            if (this.audioContext && this.audioContext.state === "suspended") {
                this.audioContext.resume().catch(function () {});
            }

            const playResult = this.audio_obj.play();
            if (playResult && typeof playResult.catch === "function") {
                playResult.catch((error) => {
                    this.is_playing = false;
                    this.is_loading = false;
                    if (error && error.name !== "AbortError") {
                        this.is_error = true;
                        this.error_msg = "La lecture n’a pas pu démarrer. Réessayez avec le bouton Lecture.";
                    }
                });
            }

            if (this.analyser && this.animationFrameId === null) {
                this.animationFrameId = requestAnimationFrame(this.timeUpdated);
            }
        },
        toggleSpeed: function () {
            const speedArray = [
                "0.5",
                "0.7",
                "1",
                "1.1",
                "1.2",
                "1.3",
                "1.4",
                "1.5",
                "1.6",
                "1.7",
                "1.8",
                "1.9",
                "2"
            ];
            const curerntIndex = speedArray.indexOf(this.speed.toString());
            let newIndex = curerntIndex + 1;

            if (newIndex > speedArray.length - 1) newIndex = 0;

            this.speed = parseFloat(speedArray[newIndex]);
            this.audio_obj.playbackRate = this.speed;
        },
        barPointerDown: function (e) {
            if (!this.audio_obj || !Number.isFinite(this.duration) || this.duration <= 0) return;

            this.bar = this.$refs.bar.getBoundingClientRect();
            this.handle_clicked = true;
            if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId !== undefined) {
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch (error) {}
            }
            this.seekFromPointer(e);
        },
        seekFromPointer: function (e) {
            if (!this.audio_obj || !this.bar || this.bar.width <= 0 ||
                !Number.isFinite(this.duration) || this.duration <= 0) return;

            const left = Math.max(0, Math.min(this.bar.width, e.clientX - this.bar.left));
            const time = (left / this.bar.width) * this.duration;
            this.current_time = time;
            this.audio_obj.currentTime = time;
        },
        seekByKeyboard: function (e) {
            if (!this.audio_obj || !Number.isFinite(this.duration) || this.duration <= 0) return;

            let target = this.audio_obj.currentTime || 0;
            switch (e.key) {
                case "ArrowLeft": target -= 5; break;
                case "ArrowRight": target += 5; break;
                case "PageDown": target -= 30; break;
                case "PageUp": target += 30; break;
                case "Home": target = 0; break;
                case "End": target = this.duration; break;
                default: return;
            }
            e.preventDefault();
            target = Math.max(0, Math.min(this.duration, target));
            this.current_time = target;
            this.audio_obj.currentTime = target;
        },
        resizeHandler: function () {
            this.bar = this.$refs.bar.getBoundingClientRect();
        },
        formatSeconds: function (secs) {
            if (!Number.isFinite(Number(secs)) || Number(secs) < 0) return "00:00";
            secs = Number(secs);
            var hr = Math.floor(secs / 3600);
            var min = Math.floor((secs - hr * 3600) / 60);
            var sec = Math.floor(secs - hr * 3600 - min * 60);

            if (min < 10) {
                min = "0" + min;
            }
            if (sec < 10) {
                sec = "0" + sec;
            }

            return min + ":" + sec;
        },
        moveHandler: function (e) {
            if (this.handle_clicked) this.seekFromPointer(e);
        },
        moveAudio: function (direction, amount) {
            let newTime = this.current_time;
            amount = parseInt(amount);

            switch (direction) {
                case "increase":
                    newTime = newTime + amount;
                    break;
                case "decrease":
                    newTime = newTime - amount;
                    break;
            }

            if (newTime > this.duration || newTime < 0) newTime = this.current_time;

            this.audio_obj.currentTime = newTime;
        },
        updateAudio: function (index) { }
    },
    computed: {
        endTime: function () {
            return this.formatSeconds(this.duration);
        },
        currentTime: function () {
            return this.formatSeconds(this.current_time);
        },
        handlePosition: function () {
            if (!Number.isFinite(this.duration) || this.duration <= 0 ||
                !Number.isFinite(this.current_time) || this.current_time <= 0) return "0%";
            return Math.max(0, Math.min(100, (this.current_time * 100) / this.duration)) + "%";
        },
        leftTime: function () {
            return this.duration - this.current_time;
        },
        maxAudioPin: function () {
            return this.audio_pins
                .slice()
                .sort((a, b) => b - a)
                .slice(0, 1);
        },
        normlizeAudioPins: function () {
            // 20 is the max length
            return this.audio_pins.map((p) => {
                return (p * 20) / this.maxAudioPin;
            });
        },
        info: function () {
            return `<p>${this.book.info.join("</p><p>")}</p>`;
        },
        coverArtTransition: function () {
            let scale = (this.cover_art_avarage * 100) / 20 / 100;
            if (scale < 0.98) scale = 0.98;

            return {
                transform: `scale(${scale})`
            };
        },
        currentLink: function () {
            this.audio_obj.src = this.book.chapters[this.audio_index].link;
        }
    },
    watch: {
        audio_index: function (newIndex, oldVal) {
            if (this.isInitializing || newIndex === oldVal ||
                !this.audio_obj || !this.book.chapters[newIndex]) return;

            this.current_time = 0;
            this.duration = 0;
            this.buffered = [];
            this.audio_obj.src = this.book.chapters[newIndex].link;
            this.audio_obj.load();
            this.is_loading = true;

            const playResult = this.audio_obj.play();
            if (playResult && typeof playResult.catch === "function") {
                playResult.catch((error) => {
                    this.is_playing = false;
                    if (error && error.name !== "AbortError") {
                        this.is_error = true;
                        this.error_msg = "La piste n’a pas pu démarrer. Utilisez le bouton Lecture pour réessayer.";
                    }
                });
            }
        }
    }
});
