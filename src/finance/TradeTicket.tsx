// TradeTicket: an order entry form for an exchange (buy or sell an instrument) or a binary market (buy YES or NO
// shares that pay 1 unit if right). The side and the order type are radio groups; the amount is a MoneyField and the
// quantity a NumberField, both reported as decimal strings. The app works out the fill (it knows the book) and passes
// an estimate back, which the ticket shows and announces (debounced). Review opens a confirmation summarising the
// order, an alertdialog when the order is at or over `confirmThreshold`; confirming awaits `onSubmit`, with a pending
// state and the error inline.

import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  RadioButton,
  RadioField,
  RadioGroup as AriaRadioGroup,
  useLocale,
} from 'react-aria-components';
import { Banner } from '../components/Banner/Banner';
import { Button } from '../components/Button/Button';
import { ButtonGroup } from '../components/ButtonGroup/ButtonGroup';
import { Dialog } from '../components/Dialog/Dialog';
import {
  decimalCompare,
  decimalMultiply,
  decimalSubtract,
  isDecimal,
} from '../components/MoneyField/decimal';
import { currencyMinorUnits } from '../components/MoneyField/money';
import { MoneyField } from '../components/MoneyField/MoneyField';
import { NumberField } from '../components/NumberField/NumberField';
import { Radio, RadioGroup } from '../components/RadioGroup/RadioGroup';
import { cn } from '../utils/cn';
import { useDebouncedCallback } from '../utils/timers';
import { useControllableState } from '../utils/useControllableState';
import { decimalScale } from './book';
import { formatDecimal, formatPercentValue, money } from './format';
import { useFinanceMessages, type FinanceStrings } from './messages';

/** Which way the order goes: `buy`/`sell` on an exchange, `yes`/`no` in a binary market. */
export type TradeSide = 'buy' | 'sell' | 'yes' | 'no';

/** A market order fills at the best available prices; a limit order only at `price` or better. */
export type OrderType = 'market' | 'limit';

/** What the user has entered, as decimal strings. Only the fields for the current order type and input mode are set. */
export interface TradeDraft {
  /** The limit price (limit orders). */
  price?: string;
  /** The quantity (input mode `quantity`). */
  quantity?: string;
  /** The amount to spend (input mode `amount`). */
  amount?: string;
}

/** The app's estimate of the fill, as decimal strings. */
export interface TradeEstimate {
  averagePrice: string;
  quantity: string;
  /** What the order costs (buying) or brings in (selling), fees included. */
  cost: string;
  fees: string;
  /** Binary markets: what the position pays if it's right. */
  payout?: string;
  /** Binary markets: the return if right, in per cent ("61.28"). */
  returnPct?: string;
  /** The expected slippage from the best price, in per cent ("0.4"). */
  slippagePct?: string;
}

/** The best prices, as decimal strings; binary prices are 0–1. */
export interface TradeQuote {
  bid?: string;
  ask?: string;
  last?: string;
}

export interface TradeTicketProps {
  /** `exchange`: buy or sell an instrument. `binary`: YES or NO shares that pay 1 unit if right. */
  kind: 'exchange' | 'binary';
  /** The side, controlled. */
  side?: TradeSide;
  /** The initial side, uncontrolled. Defaults to `buy` (exchange) or `yes` (binary). */
  defaultSide?: TradeSide;
  onSideChange?: (side: TradeSide) => void;
  /** The order type, controlled. */
  orderType?: OrderType;
  /** The initial order type, uncontrolled. Defaults to `market`. */
  defaultOrderType?: OrderType;
  onOrderTypeChange?: (type: OrderType) => void;
  /** Best prices, shown above the inputs (and beside the binary sides). */
  quote: TradeQuote;
  /** The ISO 4217 currency code ("USD"). */
  currency: string;
  /** Enter by amount to spend or by quantity, controlled. */
  inputMode?: 'amount' | 'quantity';
  /** The initial input mode, uncontrolled. Defaults to `amount`. */
  defaultInputMode?: 'amount' | 'quantity';
  onInputModeChange?: (mode: 'amount' | 'quantity') => void;
  /** What's entered, controlled (for example to fill the price from an OrderBook). */
  draft?: TradeDraft;
  /** The initial entry, uncontrolled. */
  defaultDraft?: TradeDraft;
  /** Called with the entry whenever a field is committed, so the app can work out `estimate`. */
  onDraftChange?: (draft: TradeDraft) => void;
  /** The app's estimate of the fill and fees for the current draft. */
  estimate?: TradeEstimate;
  /** The available balance, as a decimal string. */
  balance?: string;
  /** Places the order, after confirmation. A rejection shows its message in the confirmation. */
  onSubmit: () => Promise<void>;
  /** Warnings from the app, such as high slippage or insufficient balance. */
  warnings?: readonly string[];
  /**
   * Orders whose cost (or amount) is at or over this decimal string are confirmed in an `alertdialog` with a note
   * of the size. Smaller orders get a plain dialog.
   */
  confirmThreshold?: string;
  /** Fraction digits of a limit price. Defaults to 2 for binary markets and the currency's minor units otherwise. */
  priceDecimals?: number;
  /** Fraction digits of a quantity. Defaults to 2 for binary markets and 4 otherwise. */
  quantityDecimals?: number;
  /** The quantity's unit, shown after it ("STAR"). */
  quantityUnit?: string;
  isDisabled?: boolean;
  /** Names the ticket. Defaults to the `tradeTicketLabel` message. */
  'aria-label'?: string;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

type SideTone = 'success' | 'danger';
const sideTones: Record<TradeSide, SideTone> = {
  buy: 'success',
  yes: 'success',
  sell: 'danger',
  no: 'danger',
};
const selectedSideClasses: Record<SideTone, string> = {
  success: 'bg-success-solid text-success-on-solid',
  danger: 'bg-danger-solid text-danger-on-solid',
};

interface Row {
  id: string;
  label: string;
  value: ReactNode;
}

/** Label–value rows, label at the start and value at the end. */
function Rows({ rows, className }: { rows: readonly Row[]; className?: string }) {
  return (
    <dl className={cn('flex flex-col gap-1 text-sm', className)}>
      {rows.map((row) => (
        <div key={row.id} data-row={row.id} className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">{row.label}</dt>
          <dd className="text-end font-medium text-fg tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function sideLabel(side: TradeSide, messages: FinanceStrings): string {
  switch (side) {
    case 'buy':
      return messages.tradeBuy;
    case 'sell':
      return messages.tradeSell;
    case 'yes':
      return messages.yes;
    case 'no':
      return messages.no;
  }
}

/**
 * An order ticket for exchanges and binary (YES/NO) markets: toned side choice, market or limit, an amount or a
 * quantity, the app's estimate (average price, quantity, cost, fees, payout and return, slippage), the balance and
 * the app's warnings. Review opens a confirmation summarising the order; confirming awaits `onSubmit`. Works by
 * keyboard alone: arrow keys choose within the radio groups and Tab moves between them and the fields.
 */
export function TradeTicket({
  kind,
  side: sideProp,
  defaultSide,
  onSideChange,
  orderType: orderTypeProp,
  defaultOrderType = 'market',
  onOrderTypeChange,
  quote,
  currency,
  inputMode: inputModeProp,
  defaultInputMode = 'amount',
  onInputModeChange,
  draft: draftProp,
  defaultDraft,
  onDraftChange,
  estimate,
  balance,
  onSubmit,
  warnings = [],
  confirmThreshold,
  priceDecimals,
  quantityDecimals,
  quantityUnit,
  isDisabled = false,
  'aria-label': ariaLabel,
  className,
  ref,
}: TradeTicketProps) {
  const messages = useFinanceMessages();
  const { locale } = useLocale();
  const isBinary = kind === 'binary';
  const [side, setSide] = useControllableState(
    sideProp,
    defaultSide ?? (isBinary ? 'yes' : 'buy'),
    onSideChange,
  );
  const [orderType, setOrderType] = useControllableState(
    orderTypeProp,
    defaultOrderType,
    onOrderTypeChange,
  );
  const [inputMode, setInputMode] = useControllableState(
    inputModeProp,
    defaultInputMode,
    onInputModeChange,
  );
  const [draft, setDraft] = useControllableState(draftProp, defaultDraft ?? {}, onDraftChange);
  const [hasTriedReview, setTriedReview] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isPending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const estimateLabelId = useId();
  const priceInput = useRef<HTMLInputElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const quantityInput = useRef<HTMLInputElement>(null);

  const minorUnits = currencyMinorUnits(currency);
  const priceDigits = priceDecimals ?? (isBinary ? 2 : minorUnits);
  const quantityDigits = quantityDecimals ?? (isBinary ? 2 : 4);
  const sides: readonly TradeSide[] = isBinary ? ['yes', 'no'] : ['buy', 'sell'];
  const isBuying = side !== 'sell';
  const cash = (value: string) => money(value, currency, locale);
  const price = (value: string) =>
    money(value, currency, locale, Math.max(priceDigits, decimalScale(value)));
  const quantityText = (value: string) => {
    const formatted = formatDecimal(value, locale, Math.min(decimalScale(value), quantityDigits));
    return quantityUnit === undefined ? formatted : `${formatted} ${quantityUnit}`;
  };

  // A binary side's price: YES at the ask, NO at 1 minus the YES bid.
  const binaryPrice = (option: TradeSide): string | undefined => {
    if (option === 'yes') {
      return quote.ask;
    }
    return quote.bid !== undefined && isDecimal(quote.bid)
      ? decimalSubtract('1', quote.bid)
      : undefined;
  };

  const isPositive = (value: string | undefined): value is string =>
    value !== undefined && isDecimal(value) && decimalCompare(value, '0') > 0;
  const missingPrice = orderType === 'limit' && !isPositive(draft.price);
  const missingAmount = inputMode === 'amount' && !isPositive(draft.amount);
  const missingQuantity = inputMode === 'quantity' && !isPositive(draft.quantity);

  // The order's value, for the confirmation threshold: the estimate's cost, the amount, or quantity × limit price.
  const orderValue =
    estimate?.cost ??
    (inputMode === 'amount'
      ? draft.amount
      : isPositive(draft.quantity) && orderType === 'limit' && isPositive(draft.price)
        ? decimalMultiply(draft.quantity, draft.price)
        : undefined);
  const isLargeOrder =
    confirmThreshold !== undefined &&
    isDecimal(confirmThreshold) &&
    orderValue !== undefined &&
    isDecimal(orderValue) &&
    decimalCompare(orderValue, confirmThreshold) >= 0;

  // Announce estimate changes once they settle (not on first render, and not while typing quickly).
  const [announcement, setAnnouncement] = useState('');
  const announceLater = useDebouncedCallback(setAnnouncement, 800);
  const estimateText =
    estimate === undefined
      ? ''
      : [
          messages.tradeEstimateAnnouncement({
            quantity: quantityText(estimate.quantity),
            cost: cash(estimate.cost),
          }),
          isBinary && estimate.payout !== undefined && estimate.returnPct !== undefined
            ? messages.tradePayoutAnnouncement({
                payout: cash(estimate.payout),
                returnPct: formatPercentValue(estimate.returnPct, locale, { hasSign: true }),
              })
            : '',
        ]
          .filter(Boolean)
          .join(' ');
  const announcedText = useRef(estimateText);
  useEffect(() => {
    if (announcedText.current === estimateText) {
      return;
    }
    announcedText.current = estimateText;
    announceLater.run(estimateText);
  }, [estimateText, announceLater]);

  const update = (patch: TradeDraft) => {
    setDraft({ ...draft, ...patch });
  };

  const review = () => {
    setTriedReview(true);
    const firstMissing = missingPrice
      ? priceInput
      : missingAmount
        ? amountInput
        : missingQuantity
          ? quantityInput
          : null;
    if (firstMissing) {
      firstMissing.current?.focus();
      return;
    }
    setSubmitError(null);
    setConfirmOpen(true);
  };

  const confirm = async (close: () => void) => {
    if (isPending) {
      return;
    }
    setSubmitError(null);
    setPending(true);
    try {
      await onSubmit();
      setPending(false);
      setTriedReview(false);
      close();
    } catch (reason) {
      setPending(false);
      setSubmitError(
        reason instanceof Error && reason.message !== '' ? reason.message : messages.genericError,
      );
    }
  };

  const estimateRows: Row[] =
    estimate === undefined
      ? []
      : [
          {
            id: 'averagePrice',
            label: messages.tradeAveragePrice,
            value: price(estimate.averagePrice),
          },
          {
            id: 'quantity',
            label: isBinary ? messages.tradeShares : messages.tradeQuantity,
            value: quantityText(estimate.quantity),
          },
          { id: 'fees', label: messages.tradeFees, value: cash(estimate.fees) },
          {
            id: 'cost',
            label: isBuying ? messages.tradeCost : messages.tradeProceeds,
            value: cash(estimate.cost),
          },
          ...(estimate.payout === undefined
            ? []
            : [{ id: 'payout', label: messages.tradePayout, value: cash(estimate.payout) }]),
          ...(estimate.returnPct === undefined
            ? []
            : [
                {
                  id: 'return',
                  label: messages.tradeReturn,
                  value: formatPercentValue(estimate.returnPct, locale, { hasSign: true }),
                },
              ]),
          ...(estimate.slippagePct === undefined
            ? []
            : [
                {
                  id: 'slippage',
                  label: messages.tradeSlippage,
                  value: formatPercentValue(estimate.slippagePct, locale),
                },
              ]),
        ];

  const quoteRows: Row[] = [
    ...(quote.bid === undefined
      ? []
      : [{ id: 'bid', label: messages.tradeBestBid, value: price(quote.bid) }]),
    ...(quote.ask === undefined
      ? []
      : [{ id: 'ask', label: messages.tradeBestAsk, value: price(quote.ask) }]),
    ...(quote.last === undefined
      ? []
      : [{ id: 'last', label: messages.tradeLast, value: price(quote.last) }]),
  ];

  const summaryRows: Row[] = [
    { id: 'side', label: messages.tradeSide, value: sideLabel(side, messages) },
    {
      id: 'orderType',
      label: messages.tradeOrderType,
      value: orderType === 'limit' ? messages.tradeLimit : messages.tradeMarket,
    },
    {
      id: 'price',
      label: messages.tradeLimitPrice,
      value:
        orderType === 'limit' && draft.price !== undefined
          ? price(draft.price)
          : messages.tradeAtMarket,
    },
    ...(inputMode === 'amount' && draft.amount !== undefined && estimate === undefined
      ? [{ id: 'amount', label: messages.tradeAmount, value: cash(draft.amount) }]
      : []),
    ...(inputMode === 'quantity' && draft.quantity !== undefined && estimate === undefined
      ? [
          {
            id: 'quantity',
            label: isBinary ? messages.tradeShares : messages.tradeQuantity,
            value: quantityText(draft.quantity),
          },
        ]
      : []),
    ...estimateRows,
  ];

  const tone = sideTones[side];

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? messages.tradeTicketLabel}
      className={cn('flex min-w-0 flex-col gap-4', className)}
    >
      <AriaRadioGroup
        aria-label={messages.tradeSide}
        value={side}
        onChange={(value) => {
          setSide(value as TradeSide);
        }}
        orientation="horizontal"
        isDisabled={isDisabled}
        className="grid grid-cols-2 gap-1 rounded-control border border-border bg-surface-2 p-1"
      >
        {sides.map((option) => {
          const optionPrice = isBinary ? binaryPrice(option) : undefined;
          const label = sideLabel(option, messages);
          return (
            <RadioField key={option} value={option} className="flex min-w-0">
              <RadioButton
                className={({ isSelected }) =>
                  cn(
                    'flex min-h-hit flex-1 cursor-pointer items-center justify-center rounded-control px-3 py-1.5 text-sm font-medium select-none',
                    'transition-colors duration-(--duration-fast) ease-standard',
                    'data-focus-visible:focus-ring data-disabled:cursor-not-allowed data-disabled:opacity-50',
                    isSelected
                      ? selectedSideClasses[sideTones[option]]
                      : 'text-fg-muted data-hovered:bg-surface-3 data-hovered:text-fg',
                  )
                }
              >
                {optionPrice === undefined
                  ? label
                  : messages.tradeSideWithPrice({ side: label, price: price(optionPrice) })}
              </RadioButton>
            </RadioField>
          );
        })}
      </AriaRadioGroup>

      <RadioGroup<OrderType>
        label={messages.tradeOrderType}
        value={orderType}
        onChange={(type) => {
          setOrderType(type);
          if (type === 'market' && draft.price !== undefined) {
            update({ price: undefined });
          }
        }}
        orientation="horizontal"
        isDisabled={isDisabled}
      >
        <Radio value="market">{messages.tradeMarket}</Radio>
        <Radio value="limit">{messages.tradeLimit}</Radio>
      </RadioGroup>

      {quoteRows.length > 0 && !isBinary && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
          {quoteRows.map((row) => (
            <div key={row.id} className="flex gap-1">
              <dt className="text-fg-muted">{row.label}</dt>
              <dd className="font-medium text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {orderType === 'limit' && (
        <MoneyField
          label={messages.tradeLimitPrice}
          currency={currency}
          minorUnits={priceDigits}
          maxValue={isBinary ? '1' : undefined}
          value={draft.price ?? null}
          onChange={(value) => {
            update({ price: value ?? undefined });
          }}
          isInvalid={hasTriedReview && missingPrice}
          errorMessage={hasTriedReview && missingPrice ? messages.tradePriceRequired : undefined}
          isDisabled={isDisabled}
          inputRef={priceInput}
        />
      )}

      <div className="flex flex-col gap-1">
        {inputMode === 'amount' ? (
          <MoneyField
            label={messages.tradeAmount}
            currency={currency}
            value={draft.amount ?? null}
            onChange={(value) => {
              update({ amount: value ?? undefined });
            }}
            isInvalid={hasTriedReview && missingAmount}
            errorMessage={
              hasTriedReview && missingAmount ? messages.tradeAmountRequired : undefined
            }
            isDisabled={isDisabled}
            inputRef={amountInput}
          />
        ) : (
          <NumberField
            label={isBinary ? messages.tradeShares : messages.tradeQuantity}
            value={
              draft.quantity !== undefined && isDecimal(draft.quantity)
                ? Number(draft.quantity)
                : null
            }
            onChange={(value) => {
              // The typed number becomes a decimal string at the quantity's precision.
              update({ quantity: value === null ? undefined : value.toFixed(quantityDigits) });
            }}
            minValue={0}
            formatOptions={{ maximumFractionDigits: quantityDigits }}
            suffix={quantityUnit}
            isInvalid={hasTriedReview && missingQuantity}
            errorMessage={
              hasTriedReview && missingQuantity ? messages.tradeQuantityRequired : undefined
            }
            isDisabled={isDisabled}
            inputRef={quantityInput}
          />
        )}
        <Button
          variant="link"
          size="sm"
          tone="accent"
          isDisabled={isDisabled}
          onPress={() => {
            const next = inputMode === 'amount' ? 'quantity' : 'amount';
            setInputMode(next);
            setDraft({ price: draft.price });
          }}
          className="self-start"
        >
          {inputMode === 'amount' ? messages.tradeEnterQuantity : messages.tradeEnterAmount}
        </Button>
      </div>

      {balance !== undefined && (
        <Rows rows={[{ id: 'balance', label: messages.tradeBalance, value: cash(balance) }]} />
      )}

      {estimate !== undefined && (
        <div
          role="group"
          aria-labelledby={estimateLabelId}
          className="flex flex-col gap-2 rounded-control border border-border bg-surface-2 p-3"
        >
          <p id={estimateLabelId} className="text-xs font-semibold text-fg-muted">
            {messages.tradeEstimate}
          </p>
          <Rows rows={estimateRows} />
        </div>
      )}

      {warnings.length > 0 && (
        <Banner tone="warning">
          {warnings.length === 1 ? (
            warnings[0]
          ) : (
            <ul className="list-disc ps-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </Banner>
      )}

      <Button
        tone={tone}
        isDisabled={isDisabled}
        isPending={isPending}
        onPress={review}
        className="w-full"
      >
        {messages.tradeReview}
      </Button>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <Dialog
        title={messages.tradeConfirmTitle}
        role={isLargeOrder ? 'alertdialog' : 'dialog'}
        size="sm"
        isBusy={isPending}
        isOpen={isConfirmOpen}
        onOpenChange={setConfirmOpen}
        footer={(close) => (
          <ButtonGroup>
            <Button slot="close" variant="outline" isDisabled={isPending}>
              {messages.cancel}
            </Button>
            <Button tone={tone} isPending={isPending} onPress={() => void confirm(close)}>
              {messages.tradePlaceOrder}
            </Button>
          </ButtonGroup>
        )}
      >
        <div className="flex flex-col gap-3">
          <Rows rows={summaryRows} />
          {isLargeOrder && (
            <p className="font-medium">
              {messages.tradeLargeOrder({ threshold: cash(confirmThreshold) })}
            </p>
          )}
          {submitError !== null && <Banner tone="danger">{submitError}</Banner>}
        </div>
      </Dialog>
    </div>
  );
}
