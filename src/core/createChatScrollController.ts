import {
	cancelNextFrame,
	captureScrollAnchor,
	DEFAULT_THRESHOLD_PX,
	getScrollMetrics,
	getScrollTopForBottom,
	isNearBottom,
	isNearTop,
	isUsableScrollContainer,
	normalizeThreshold,
	requestNextFrame,
	restoreScrollAnchor,
	shouldAutoScrollBottom,
	waitForNextFrame,
} from "./scrollMath";
import type {
	ChatScrollController,
	ChatScrollOptions,
	ChatScrollState,
	Direction,
} from "../types";

type MutableOptions = ChatScrollOptions<any>;

export function createChatScrollController<TMessage>(
	initialOptions: ChatScrollOptions<TMessage>,
): ChatScrollController {
	assertContainer(initialOptions.container);

	let options: MutableOptions = { ...initialOptions };
	let destroyed = false;
	let loadingTop = false;
	let loadingBottom = false;
	let topArmed = true;
	let bottomArmed = true;
	let scheduledFrame: number | ReturnType<typeof setTimeout> | null = null;

	const handleScroll = () => {
		scheduleCheck();
	};

	bindContainer(options.container);

	function bindContainer(container: HTMLElement): void {
		container.addEventListener("scroll", handleScroll, { passive: true });
	}

	function unbindContainer(container: HTMLElement): void {
		container.removeEventListener("scroll", handleScroll);
	}

	function scheduleCheck(): void {
		if (destroyed || scheduledFrame !== null) {
			return;
		}

		scheduledFrame = requestNextFrame(() => {
			scheduledFrame = null;
			runCheck();
		});
	}

	function runCheck(): void {
		if (destroyed || options.disabled) {
			return;
		}

		const container = options.container;
		assertContainer(container);

		const metrics = getScrollMetrics(container);
		if (!isUsableScrollContainer(metrics)) {
			return;
		}

		const topThreshold = normalizeThreshold(
			options.thresholdPx,
			DEFAULT_THRESHOLD_PX,
		);
		const bottomThreshold = normalizeThreshold(
			options.bottomThresholdPx,
			topThreshold,
		);
		const nearTop = isNearTop(metrics, topThreshold);
		const nearBottom = isNearBottom(metrics, bottomThreshold);

		if (!nearTop) {
			topArmed = true;
		}

		if (!nearBottom) {
			bottomArmed = true;
		}

		if (
			options.onLoadTop &&
			options.hasMoreTop !== false &&
			!loadingTop &&
			topArmed &&
			nearTop
		) {
			topArmed = false;
			void loadTop();
		}

		if (
			options.onLoadBottom &&
			options.hasMoreBottom !== false &&
			!loadingBottom &&
			bottomArmed &&
			nearBottom
		) {
			bottomArmed = false;
			void loadBottom();
		}
	}

	async function loadTop(): Promise<void> {
		if (!options.onLoadTop || loadingTop || destroyed || options.disabled) {
			return;
		}

		setLoading("top", true);

		try {
			const messages = await normalizeMessages(options.onLoadTop());
			if (destroyed || options.disabled || messages.length === 0) {
				return;
			}

			const anchor = captureScrollAnchor(options.container);
			await options.onMergeTop?.(messages);
			await waitForNextFrame();

			if (!destroyed) {
				restoreScrollAnchor(options.container, anchor);
			}
		} catch (error) {
			notifyError(error, "top");
		} finally {
			setLoading("top", false);
		}
	}

	async function loadBottom(): Promise<void> {
		if (
			!options.onLoadBottom ||
			loadingBottom ||
			destroyed ||
			options.disabled
		) {
			return;
		}

		setLoading("bottom", true);

		try {
			const startMetrics = getScrollMetrics(options.container);
			const bottomThreshold = normalizeThreshold(
				options.bottomThresholdPx,
				normalizeThreshold(options.thresholdPx, DEFAULT_THRESHOLD_PX),
			);
			const wasNearBottomAtStart = isNearBottom(startMetrics, bottomThreshold);
			const messages = await normalizeMessages(options.onLoadBottom());

			if (destroyed || options.disabled || messages.length === 0) {
				return;
			}

			const wasNearBottomBeforeMerge = isNearBottom(
				getScrollMetrics(options.container),
				bottomThreshold,
			);

			await options.onMergeBottom?.(messages);
			await waitForNextFrame();

			if (
				!destroyed &&
				shouldAutoScrollBottom(
					wasNearBottomAtStart && wasNearBottomBeforeMerge,
					options.autoScrollBottom !== false,
				)
			) {
				scrollContainerToBottom(options.container);
			}
		} catch (error) {
			notifyError(error, "bottom");
		} finally {
			setLoading("bottom", false);
		}
	}

	function setLoading(direction: Direction, value: boolean): void {
		if (direction === "top") {
			loadingTop = value;
		} else {
			loadingBottom = value;
		}

		if (!destroyed) {
			options.onLoadingChange?.(getState());
		}
	}

	function notifyError(error: unknown, direction: Direction): void {
		options.onLoadError?.(error, direction);
	}

	function getState(): ChatScrollState {
		return {
			isLoadingTop: loadingTop,
			isLoadingBottom: loadingBottom,
		};
	}

	function scrollContainerToTop(container: HTMLElement): void {
		container.scrollTop = 0;
	}

	function scrollContainerToBottom(container: HTMLElement): void {
		container.scrollTop = getScrollTopForBottom(getScrollMetrics(container));
	}

	return {
		check: runCheck,
		scrollToTop(scrollOptions?: ScrollIntoViewOptions) {
			if (destroyed) {
				return;
			}

			if (
				scrollOptions?.behavior === "smooth" &&
				typeof options.container.scrollTo === "function"
			) {
				options.container.scrollTo({ top: 0, behavior: "smooth" });
				return;
			}

			scrollContainerToTop(options.container);
		},
		scrollToBottom(scrollOptions?: ScrollIntoViewOptions) {
			if (destroyed) {
				return;
			}

			const top = getScrollTopForBottom(getScrollMetrics(options.container));
			if (
				scrollOptions?.behavior === "smooth" &&
				typeof options.container.scrollTo === "function"
			) {
				options.container.scrollTo({ top, behavior: "smooth" });
				return;
			}

			options.container.scrollTop = top;
		},
		update(partialOptions: Partial<ChatScrollOptions<any>>) {
			if (destroyed) {
				return;
			}

			const previousContainer = options.container;
			options = { ...options, ...partialOptions };
			assertContainer(options.container);

			if (options.container !== previousContainer) {
				unbindContainer(previousContainer);
				bindContainer(options.container);
			}
		},
		getState,
		destroy() {
			if (destroyed) {
				return;
			}

			destroyed = true;
			if (scheduledFrame !== null) {
				cancelNextFrame(scheduledFrame);
				scheduledFrame = null;
			}

			unbindContainer(options.container);
		},
	};
}

async function normalizeMessages<TMessage>(
	value: TMessage[] | Promise<TMessage[]>,
): Promise<TMessage[]> {
	const messages = await value;
	return Array.isArray(messages) ? messages : [];
}

function assertContainer(
	container: HTMLElement | null | undefined,
): asserts container is HTMLElement {
	if (
		!container ||
		typeof container.addEventListener !== "function" ||
		typeof container.removeEventListener !== "function"
	) {
		throw new Error("chat-scroll-behavior requires a valid scroll container.");
	}
}
