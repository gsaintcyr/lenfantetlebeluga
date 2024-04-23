const book = {
    title: "L'enfant et le béluga",
    author: "Gaétane Saint-Cyr",
    cover_art:
        "https://lenfantetlebeluga.com/lenfantetlebeluga.jpeg",
    info: [
        'Crime and Punishment is the Fyodor Dostoyevsky\'s full-length novel"',
    ],
    chapters: [
        {
            name: "Preface",
            link:
                "https://ia800604.us.archive.org/20/items/crime_punishment_3_1708_librivox/crimepunishment_00_dostoyevsky_128kb.mp3",
            reader: "Mark Nelson",
            duration: "00:05:38"
        },
        {
            name: "Part 1 Chapter 1",
            link:
                "https://ia800604.us.archive.org/20/items/crime_punishment_3_1708_librivox/crimepunishment_01_dostoyevsky_128kb.mp3",
            reader: "Mark Nelson",
            duration: "00:21:23"
        },
        {
            name: "Part 1 Chapter 2",
            link:
                "https://ia800604.us.archive.org/20/items/crime_punishment_3_1708_librivox/crimepunishment_02_dostoyevsky_128kb.mp3",
            reader: "Mark Nelson",
            duration: "00:46:57"
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

        document.addEventListener("mousedown", this.mouseDown);
        document.addEventListener("mouseup", (e) => (this.handle_click = false));
        document.addEventListener("mousemove", this.moveHandler);

        window.addEventListener("resize", this.resizeHandler);

        // initiate audio obj
        this.audio_obj = new Audio(this.book.chapters[this.audio_index].link);
        this.audio_obj.crossOrigin = "anonymous";
        this.audio_obj.src = this.book.chapters[this.audio_index].link;
        this.audio_obj.load();

        this.audio_obj.addEventListener("timeupdate", () => {
            localStorage.setItem("audiobookTime", this.audio_obj.currentTime);
            localStorage.setItem("audiobookChapter", this.audio_index);
        });

        const savedTime = localStorage.getItem("audiobookTime");
        const savedChapter = localStorage.getItem("audiobookChapter");

        if (savedChapter !== null) {
            this.audio_index = parseInt(savedChapter, 10);
            this.audio_obj.src = this.book.chapters[this.audio_index].link;
            this.audio_obj.load();
        }

        this.audio_obj.addEventListener("loadedmetadata", () => {
            if (savedTime !== null) {
                this.audio_obj.currentTime = parseFloat(savedTime);
            }

            this.audio_obj.addEventListener("canplay", () => {
                this.is_loading = false;
                // Consider auto-playing the audio here, if that fits your user experience
                // this.audio_obj.play();
            });
        });

        this.audio_obj.addEventListener("loadeddata", () => {
            this.duration = this.audio_obj.duration;
        });

        this.audio_obj.addEventListener("ended", this.onEnded);
        this.audio_obj.addEventListener("progress", this.onProgress);
        this.audio_obj.addEventListener("loadedmetadata", this.onProgress);
        this.audio_obj.addEventListener("playing", (e) => (this.is_playing = true));
        this.audio_obj.addEventListener("pause", (e) => (this.is_playing = false));
        this.audio_obj.addEventListener(
            "canplay",
            (e) => (this.is_loading = false)
        );
        this.audio_obj.addEventListener("seeking", (e) => (this.is_loading = true));
        this.audio_obj.onerror = this.onError;
    },
    methods: {
        onError: function () {
            let msg = this.audio_obj.error.code + `: ` + this.audio_obj.error.message;
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
            this.current_time = this.audio_obj.currentTime;
            this.analyser.getByteTimeDomainData(this.data_array);
            this.audio_pins = Array.from(this.data_array);

            requestAnimationFrame(this.timeUpdated);
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
            const ctx = new AudioContext();
            this.analyser = ctx.createAnalyser();
            const audioSrc = ctx.createMediaElementSource(this.audio_obj);

            // we could configure the analyser: e.g. analyser.fftSize (for further infos read the spec)
            // 256
            this.analyser.minDecibels = -90;
            this.analyser.maxDecibels = -10;
            this.analyser.smoothingTimeConstant = 0.75;
            this.analyser.fftSize = 128;

            // we have to connect the MediaElementSource with the analyser
            audioSrc.connect(this.analyser);
            this.analyser.connect(ctx.destination);

            const bufferLength = this.analyser.frequencyBinCount;
            this.data_array = new Uint8Array(bufferLength);
        },
        playAudio: function () {
            if (this.is_playing) this.audio_obj.pause();
            else this.audio_obj.play();

            if (this.analyser == null) {
                this.initAnalyser();
                requestAnimationFrame(this.timeUpdated);
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
        barClick: function (e) {
            const clickPos = e.clientX - this.bar.x;
            const time = (clickPos * this.duration) / this.bar.width;
            this.audio_obj.currentTime = time;
            this.handle_click = true;
        },
        mouseDown: function (e) {
            if (e.target.id == "handle") this.handle_click = true;
        },
        resizeHandler: function () {
            this.bar = this.$refs.bar.getBoundingClientRect();
        },
        formatSeconds: function (secs) {
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
            let barWidth = this.bar.width;
            let barLeft = this.bar.x;
            let barRight = this.bar.right;

            if (this.handle_click) {
                let left = e.clientX - barLeft;
                if (left < 0) left = 0;

                if (left > barWidth) left = barWidth;

                this.current_time = (left * this.duration) / barWidth;
                this.audio_obj.currentTime = this.current_time;
            }
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
            return (this.current_time * 100) / this.duration + "%";
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
            this.audio_obj.src = this.book.chapters[newIndex].link;
            this.audio_obj.play();
            this.is_loading = true;
        }
    }
});
