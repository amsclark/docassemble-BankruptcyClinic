// ════════════════════════════════════════════════════════════════════
//  TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════════════

export interface DebtorProfile {
  first: string;
  middle: string;
  last: string;
  suffix?: string;
  street: string;
  city: string;
  state: 'Nebraska' | 'South Dakota';
  zip: string;
  countyIndex: number;
  taxIdType: 'ssn' | 'ein';
  taxId: string;
  hasMailing?: boolean;
  mailStreet?: string;
  mailCity?: string;
  mailState?: string;
  mailZip?: string;
  aliases?: { first: string; last: string }[];
}

export interface SpouseProfile extends DebtorProfile {}

export interface RealPropertyData {
  street: string;
  city: string;
  stateAbbr: string;
  zip: string;
  county: string;
  typeIndex: number;
  value: string;
  ownershipInterest: string;
  otherInfo: string;
}

export interface VehicleData {
  make: string;
  model: string;
  year: string;
  mileage: string;
  value: string;
  state: string;
  hasLoan: boolean;
  loanAmount?: string;
  otherInfo?: string;
}

export interface DepositData {
  type: string;
  institution: string;
  amount: string;
}

export interface PropertyData {
  realProperties?: RealPropertyData[];
  vehicles?: VehicleData[];
  deposits?: DepositData[];
  // Legacy single-item fields (used by existing navigation functions)
  realProperty?: RealPropertyData;
  vehicle?: VehicleData;
  deposit?: DepositData;
}

export interface SecuredCreditorData {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  claimAmount: string;
  collateralValue: string;
  description?: string;
}

export interface PriorityCreditorData {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  type: string;
  totalClaim: string;
  priorityAmount: string;
  nonpriorityAmount: string;
}

export interface NonpriorityCreditorData {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  totalClaim: string;
  type: string; // 'Medical', 'Credit Card', 'Student loans', 'Contract', 'Other', etc.
}

export interface CreditorData {
  secured?: SecuredCreditorData;
  securedList?: SecuredCreditorData[];
  priority?: PriorityCreditorData;
  priorityList?: PriorityCreditorData[];
  nonpriority?: NonpriorityCreditorData;
  nonpriorityList?: NonpriorityCreditorData[];
}

export interface AttorneyData {
  name: string;
  firm: string;
  agreedCompensation: string;
  priorReceived: string;
}

export interface IncomeData {
  employment: string;  // e.g. 'Employed' or 'Not employed'
  employer?: string;
  grossWages?: string;
  overtimePay?: string;
  taxDeduction?: string;
  netRentalBusiness?: string;
  interestAndDividends?: string;
  familySupport?: string;
  unemployment?: string;
  socialSecurity?: string;
  otherGovtAssist?: string;
  pension?: string;
}

export interface ExpenseData {
  rent?: string;
  mortgage?: string;
  utilities?: string;
  food?: string;
  clothing?: string;
  personalCare?: string;
  medical?: string;
  transportation?: string;
  alimony?: string;
}

export interface TestScenario {
  name: string;
  district: string;
  amended?: boolean;
  caseNumber?: string;
  debtor: DebtorProfile;
  spouse?: SpouseProfile;
  jointFiling: boolean;
  property: PropertyData;
  creditors: CreditorData;
  attorney: AttorneyData;
  rentExpense: string;
  income?: IncomeData;
  expenses?: ExpenseData;
  hasCodebtor?: boolean;
  hasContracts?: boolean;
  dependents?: number;
}

// ════════════════════════════════════════════════════════════════════
//  PERSONA 1: Simple Single Filer
// ════════════════════════════════════════════════════════════════════

export const SIMPLE_SINGLE: TestScenario = {
  name: 'simple-single-maria-garcia',
  district: 'District of Nebraska',
  debtor: {
    first: 'Maria', middle: 'L', last: 'Garcia',
    street: '456 Elm St', city: 'Lincoln', state: 'Nebraska', zip: '68508',
    countyIndex: 4, taxIdType: 'ssn', taxId: '222-33-4444',
  },
  jointFiling: false,
  property: {},
  creditors: {
    nonpriority: {
      name: 'Regional Medical Center', street: '800 Health Dr', city: 'Lincoln', state: 'Nebraska', zip: '68510',
      totalClaim: '3200', type: 'Medical',
    },
    nonpriorityList: [
      {
        name: 'Regional Medical Center', street: '800 Health Dr', city: 'Lincoln', state: 'Nebraska', zip: '68510',
        totalClaim: '3200', type: 'Medical',
      },
      {
        name: 'Visa Credit Services', street: 'PO Box 15000', city: 'Wilmington', state: 'Delaware', zip: '19886',
        totalClaim: '8500', type: 'Credit Card',
      },
    ],
  },
  attorney: { name: 'Ana Abogada, Esq.', firm: 'Lincoln Legal Aid', agreedCompensation: '1200', priorReceived: '400' },
  rentExpense: '850',
  income: {
    employment: 'Employed',
    employer: 'Lincoln City Services',
    grossWages: '2800',
    overtimePay: '0',
    taxDeduction: '420',
  },
};

// ════════════════════════════════════════════════════════════════════
//  PERSONA 2: Homeowner with Car Loan
// ════════════════════════════════════════════════════════════════════

export const HOMEOWNER_CARLOAN: TestScenario = {
  name: 'homeowner-carloan-james-wilson',
  district: 'District of Nebraska',
  debtor: {
    first: 'James', middle: 'R', last: 'Wilson',
    street: '789 Oak Dr', city: 'Omaha', state: 'Nebraska', zip: '68102',
    countyIndex: 3, taxIdType: 'ssn', taxId: '333-44-5555',
  },
  jointFiling: false,
  property: {
    realProperty: {
      street: '789 Oak Dr', city: 'Omaha', stateAbbr: 'NE', zip: '68102',
      county: 'Douglas', typeIndex: 0, value: '185000',
      ownershipInterest: 'Fee simple', otherInfo: 'Primary residence, single-family home',
    },
    vehicle: {
      make: 'Toyota', model: 'Camry', year: '2019', mileage: '45000',
      value: '18000', state: 'Nebraska', hasLoan: true, loanAmount: '12000',
      otherInfo: 'Daily commuter',
    },
    deposit: {
      type: 'Checking', institution: 'First National Bank', amount: '1200',
    },
  },
  creditors: {
    secured: {
      name: 'Wells Fargo Home Mortgage', street: '1 Home Campus', city: 'Des Moines', state: 'Iowa', zip: '50328',
      claimAmount: '165000', collateralValue: '185000',
    },
    securedList: [
      {
        name: 'Wells Fargo Home Mortgage', street: '1 Home Campus', city: 'Des Moines', state: 'Iowa', zip: '50328',
        claimAmount: '165000', collateralValue: '185000',
      },
      {
        name: 'Toyota Financial Services', street: 'PO Box 105386', city: 'Atlanta', state: 'Georgia', zip: '30348',
        claimAmount: '12000', collateralValue: '18000',
      },
    ],
    nonpriority: {
      name: 'Chase Credit Card', street: 'PO Box 15298', city: 'Wilmington', state: 'Delaware', zip: '19850',
      totalClaim: '9500', type: 'Credit Card',
    },
    nonpriorityList: [
      {
        name: 'Chase Credit Card', street: 'PO Box 15298', city: 'Wilmington', state: 'Delaware', zip: '19850',
        totalClaim: '9500', type: 'Credit Card',
      },
      {
        name: 'Capital One', street: 'PO Box 30285', city: 'Salt Lake City', state: 'Utah', zip: '84130',
        totalClaim: '7200', type: 'Credit Card',
      },
      {
        name: 'Discover Financial', street: 'PO Box 6103', city: 'Carol Stream', state: 'Illinois', zip: '60197',
        totalClaim: '5300', type: 'Credit Card',
      },
    ],
  },
  attorney: { name: 'Tom Lawyer, Esq.', firm: 'Omaha Legal Aid', agreedCompensation: '1500', priorReceived: '500' },
  rentExpense: '0',
  income: {
    employment: 'Employed',
    employer: 'Omaha Manufacturing Inc.',
    grossWages: '4200',
    overtimePay: '0',
    taxDeduction: '630',
  },
};

// ════════════════════════════════════════════════════════════════════
//  PERSONA 3: Joint Filing Couple
// ════════════════════════════════════════════════════════════════════

export const JOINT_COUPLE: TestScenario = {
  name: 'joint-couple-johnson',
  district: 'District of South Dakota',
  debtor: {
    first: 'Robert', middle: 'A', last: 'Johnson',
    street: '321 Pine Ln', city: 'Sioux Falls', state: 'South Dakota', zip: '57101',
    countyIndex: 2, taxIdType: 'ssn', taxId: '444-55-6666',
  },
  spouse: {
    first: 'Sarah', middle: 'K', last: 'Johnson',
    street: '321 Pine Ln', city: 'Sioux Falls', state: 'South Dakota', zip: '57101',
    countyIndex: 2, taxIdType: 'ssn', taxId: '444-55-7777',
  },
  jointFiling: true,
  property: {
    vehicle: {
      make: 'Honda', model: 'Civic', year: '2020', mileage: '38000',
      value: '15000', state: 'South Dakota', hasLoan: false,
      otherInfo: 'Paid off',
    },
    vehicles: [
      {
        make: 'Honda', model: 'Civic', year: '2020', mileage: '38000',
        value: '15000', state: 'South Dakota', hasLoan: false,
        otherInfo: 'Paid off',
      },
      {
        make: 'Ford', model: 'F-150', year: '2017', mileage: '82000',
        value: '22000', state: 'South Dakota', hasLoan: true, loanAmount: '8000',
        otherInfo: 'Work truck',
      },
    ],
  },
  creditors: {
    priority: {
      name: 'SD Department of Revenue', street: '445 E Capitol Ave', city: 'Pierre', state: 'South Dakota', zip: '57501',
      type: 'Taxes and certain other debts you owe the government',
      totalClaim: '2400', priorityAmount: '2400', nonpriorityAmount: '0',
    },
    nonpriority: {
      name: 'Sanford Health', street: '1305 W 18th St', city: 'Sioux Falls', state: 'South Dakota', zip: '57104',
      totalClaim: '4800', type: 'Medical',
    },
    nonpriorityList: [
      {
        name: 'Sanford Health', street: '1305 W 18th St', city: 'Sioux Falls', state: 'South Dakota', zip: '57104',
        totalClaim: '4800', type: 'Medical',
      },
      {
        name: 'Avera Medical Group', street: '3900 W Avera Dr', city: 'Sioux Falls', state: 'South Dakota', zip: '57108',
        totalClaim: '2100', type: 'Medical',
      },
      {
        name: 'Chase Credit Card', street: 'PO Box 15298', city: 'Wilmington', state: 'Delaware', zip: '19850',
        totalClaim: '6500', type: 'Credit Card',
      },
      {
        name: 'Capital One', street: 'PO Box 30285', city: 'Salt Lake City', state: 'Utah', zip: '84130',
        totalClaim: '3200', type: 'Credit Card',
      },
      {
        name: 'Prosper Personal Loan', street: '221 Main St Ste 300', city: 'San Francisco', state: 'California', zip: '94105',
        totalClaim: '5500', type: 'Other',
      },
    ],
  },
  attorney: { name: 'Pat Advocate, Esq.', firm: 'Sioux Falls Legal Aid', agreedCompensation: '2000', priorReceived: '700' },
  rentExpense: '950',
  dependents: 2,
};

// ════════════════════════════════════════════════════════════════════
//  PERSONA 4: Complex Case
// ════════════════════════════════════════════════════════════════════

export const COMPLEX_CASE: TestScenario = {
  name: 'complex-case-obrien-smith',
  district: 'District of Nebraska',
  amended: true,
  caseNumber: '8:24-bk-00123',
  debtor: {
    first: 'Patricia', middle: 'M', last: "O'Brien-Smith",
    street: '1010 Central Ave', city: 'Omaha', state: 'Nebraska', zip: '68104',
    countyIndex: 3, taxIdType: 'ssn', taxId: '555-66-7777',
    hasMailing: true,
    mailStreet: 'PO Box 999',
    mailCity: 'Omaha',
    mailState: 'Nebraska',
    mailZip: '68101',
    aliases: [{ first: 'Patty', last: "O'Brien" }],
  },
  jointFiling: false,
  property: {
    realProperty: {
      street: '2020 Rental Rd', city: 'Omaha', stateAbbr: 'NE', zip: '68105',
      county: 'Douglas', typeIndex: 0, value: '120000',
      ownershipInterest: 'Fee simple', otherInfo: 'Rental property',
    },
    vehicle: {
      make: 'Subaru', model: 'Outback', year: '2021', mileage: '32000',
      value: '25000', state: 'Nebraska', hasLoan: true, loanAmount: '15000',
      otherInfo: 'Primary vehicle',
    },
    deposit: {
      type: 'Checking', institution: 'Mutual of Omaha Bank', amount: '800',
    },
    deposits: [
      { type: 'Checking', institution: 'Mutual of Omaha Bank', amount: '800' },
      { type: 'Savings', institution: 'Mutual of Omaha Bank', amount: '2500' },
    ],
  },
  creditors: {
    secured: {
      name: 'Subaru Motors Finance', street: 'PO Box 5070', city: 'Cherry Hill', state: 'New Jersey', zip: '08002',
      claimAmount: '15000', collateralValue: '25000',
    },
    priority: {
      name: 'Internal Revenue Service', street: '1111 Constitution Ave', city: 'Washington', state: 'District of Columbia', zip: '20224',
      type: 'Taxes and certain other debts you owe the government',
      totalClaim: '5200', priorityAmount: '5200', nonpriorityAmount: '0',
    },
    priorityList: [
      {
        name: 'Internal Revenue Service', street: '1111 Constitution Ave', city: 'Washington', state: 'District of Columbia', zip: '20224',
        type: 'Taxes and certain other debts you owe the government',
        totalClaim: '5200', priorityAmount: '5200', nonpriorityAmount: '0',
      },
      {
        name: 'NE Dept of Labor', street: '550 S 16th St', city: 'Lincoln', state: 'Nebraska', zip: '68508',
        type: 'Wages, salaries, or commissions',
        totalClaim: '1800', priorityAmount: '1800', nonpriorityAmount: '0',
      },
    ],
    nonpriority: {
      name: 'American Express', street: 'PO Box 981535', city: 'El Paso', state: 'Texas', zip: '79998',
      totalClaim: '11000', type: 'Credit Card',
    },
    nonpriorityList: [
      {
        name: 'American Express', street: 'PO Box 981535', city: 'El Paso', state: 'Texas', zip: '79998',
        totalClaim: '11000', type: 'Credit Card',
      },
      {
        name: 'Discover Card', street: 'PO Box 6103', city: 'Carol Stream', state: 'Illinois', zip: '60197',
        totalClaim: '7500', type: 'Credit Card',
      },
      {
        name: 'Best Buy Credit', street: 'PO Box 9001043', city: 'Louisville', state: 'Kentucky', zip: '40290',
        totalClaim: '2200', type: 'Credit Card',
      },
    ],
  },
  attorney: { name: 'Jack Litigate, Esq.', firm: 'Central Nebraska Legal', agreedCompensation: '2000', priorReceived: '800' },
  rentExpense: '0',
  hasCodebtor: true,
  hasContracts: true,
};

// ════════════════════════════════════════════════════════════════════
//  PERSONA 5: Stress Test / Maximum Coverage
// ════════════════════════════════════════════════════════════════════

export const STRESS_TEST: TestScenario = {
  name: 'stress-test-max-coverage',
  district: 'District of South Dakota',
  debtor: {
    first: 'Alexander', middle: 'J', last: 'Maximilian',
    street: '999 Stress Test Blvd', city: 'Sioux Falls', state: 'South Dakota', zip: '57101',
    countyIndex: 2, taxIdType: 'ssn', taxId: '999-88-7777',
    aliases: [
      { first: 'Alex', last: 'Max' },
      { first: 'A.J.', last: 'Maximilian' },
    ],
  },
  jointFiling: false,
  property: {
    realProperty: {
      street: '999 Stress Test Blvd', city: 'Sioux Falls', stateAbbr: 'SD', zip: '57101',
      county: 'Minnehaha', typeIndex: 0, value: '200000',
      ownershipInterest: 'Fee simple', otherInfo: 'Primary residence',
    },
    realProperties: [
      {
        street: '999 Stress Test Blvd', city: 'Sioux Falls', stateAbbr: 'SD', zip: '57101',
        county: 'Minnehaha', typeIndex: 0, value: '200000',
        ownershipInterest: 'Fee simple', otherInfo: 'Primary residence',
      },
      {
        street: '100 Rental Ave', city: 'Brookings', stateAbbr: 'SD', zip: '57006',
        county: 'Brookings', typeIndex: 0, value: '150000',
        ownershipInterest: 'Fee simple', otherInfo: 'Rental property 1',
      },
      {
        street: '200 Investment Dr', city: 'Rapid City', stateAbbr: 'SD', zip: '57701',
        county: 'Pennington', typeIndex: 0, value: '95000',
        ownershipInterest: 'Fee simple', otherInfo: 'Rental property 2',
      },
    ],
    vehicle: {
      make: 'BMW', model: 'X5', year: '2022', mileage: '25000',
      value: '45000', state: 'South Dakota', hasLoan: true, loanAmount: '30000',
      otherInfo: 'Primary vehicle',
    },
    vehicles: [
      {
        make: 'BMW', model: 'X5', year: '2022', mileage: '25000',
        value: '45000', state: 'South Dakota', hasLoan: true, loanAmount: '30000',
        otherInfo: 'Primary vehicle',
      },
      {
        make: 'Toyota', model: 'Tacoma', year: '2018', mileage: '72000',
        value: '25000', state: 'South Dakota', hasLoan: true, loanAmount: '10000',
        otherInfo: 'Work truck',
      },
      {
        make: 'Honda', model: 'CR-V', year: '2015', mileage: '120000',
        value: '12000', state: 'South Dakota', hasLoan: false,
        otherInfo: 'Spouse vehicle',
      },
    ],
    deposit: {
      type: 'Checking', institution: 'Great Western Bank', amount: '5000',
    },
    deposits: [
      { type: 'Checking', institution: 'Great Western Bank', amount: '5000' },
      { type: 'Savings', institution: 'Dacotah Bank', amount: '8000' },
    ],
  },
  creditors: {
    secured: {
      name: 'Mortgage Corp of SD', street: '100 Bank St', city: 'Sioux Falls', state: 'South Dakota', zip: '57101',
      claimAmount: '180000', collateralValue: '200000',
    },
    securedList: [
      {
        name: 'Mortgage Corp of SD', street: '100 Bank St', city: 'Sioux Falls', state: 'South Dakota', zip: '57101',
        claimAmount: '180000', collateralValue: '200000',
      },
      {
        name: 'BMW Financial Services', street: 'PO Box 650574', city: 'Dallas', state: 'Texas', zip: '75265',
        claimAmount: '30000', collateralValue: '45000',
      },
      {
        name: 'Toyota Motor Credit', street: 'PO Box 105386', city: 'Atlanta', state: 'Georgia', zip: '30348',
        claimAmount: '10000', collateralValue: '25000',
      },
    ],
    priority: {
      name: 'Internal Revenue Service', street: '1111 Constitution Ave', city: 'Washington', state: 'District of Columbia', zip: '20224',
      type: 'Taxes and certain other debts you owe the government',
      totalClaim: '8500', priorityAmount: '8500', nonpriorityAmount: '0',
    },
    priorityList: [
      {
        name: 'Internal Revenue Service', street: '1111 Constitution Ave', city: 'Washington', state: 'District of Columbia', zip: '20224',
        type: 'Taxes and certain other debts you owe the government',
        totalClaim: '8500', priorityAmount: '8500', nonpriorityAmount: '0',
      },
      {
        name: 'SD Dept of Revenue', street: '445 E Capitol Ave', city: 'Pierre', state: 'South Dakota', zip: '57501',
        type: 'Taxes and certain other debts you owe the government',
        totalClaim: '3200', priorityAmount: '3200', nonpriorityAmount: '0',
      },
    ],
    nonpriority: {
      name: 'Chase Bank', street: 'PO Box 15298', city: 'Wilmington', state: 'Delaware', zip: '19850',
      totalClaim: '15000', type: 'Credit Card',
    },
    nonpriorityList: [
      { name: 'Chase Bank', street: 'PO Box 15298', city: 'Wilmington', state: 'Delaware', zip: '19850', totalClaim: '15000', type: 'Credit Card' },
      { name: 'Capital One', street: 'PO Box 30285', city: 'Salt Lake City', state: 'Utah', zip: '84130', totalClaim: '12000', type: 'Credit Card' },
      { name: 'American Express', street: 'PO Box 981535', city: 'El Paso', state: 'Texas', zip: '79998', totalClaim: '8500', type: 'Credit Card' },
      { name: 'Discover Financial', street: 'PO Box 6103', city: 'Carol Stream', state: 'Illinois', zip: '60197', totalClaim: '6000', type: 'Credit Card' },
      { name: 'Best Buy Credit', street: 'PO Box 9001043', city: 'Louisville', state: 'Kentucky', zip: '40290', totalClaim: '3500', type: 'Credit Card' },
    ],
  },
  attorney: { name: 'Quinn Defend, Esq.', firm: 'Sioux Falls Legal Services', agreedCompensation: '3000', priorReceived: '1200' },
  rentExpense: '0',
  dependents: 3,
};

// ════════════════════════════════════════════════════════════════════
//  LEGACY SCENARIOS (from comprehensive-e2e.spec.ts, for regression)
// ════════════════════════════════════════════════════════════════════

export const LEGACY_NE_MINIMAL: TestScenario = {
  name: 'NE-individual-minimal',
  district: 'District of Nebraska',
  debtor: {
    first: 'Alice', middle: 'M', last: 'Anderson',
    street: '100 Elm St', city: 'Omaha', state: 'Nebraska', zip: '68101',
    countyIndex: 3, taxIdType: 'ssn', taxId: '111-22-0001',
  },
  jointFiling: false,
  property: {},
  creditors: {},
  attorney: { name: 'Tom Lawyer, Esq.', firm: 'Omaha Legal Aid', agreedCompensation: '1200', priorReceived: '400' },
  rentExpense: '0',
};

export const LEGACY_SD_MINIMAL: TestScenario = {
  name: 'SD-individual-minimal',
  district: 'District of South Dakota',
  debtor: {
    first: 'Bob', middle: 'J', last: 'Baker',
    street: '200 Pine St', city: 'Sioux Falls', state: 'South Dakota', zip: '57101',
    countyIndex: 2, taxIdType: 'ssn', taxId: '222-33-0002',
  },
  jointFiling: false,
  property: {},
  creditors: {},
  attorney: { name: 'Sara Attorney, Esq.', firm: 'SD Legal Services', agreedCompensation: '1000', priorReceived: '300' },
  rentExpense: '0',
};

export const LEGACY_NE_MAXIMUM: TestScenario = {
  name: 'NE-individual-maximum-data',
  district: 'District of Nebraska',
  debtor: {
    first: 'Irene', middle: 'V', last: 'Ingram',
    street: '900 Cherry Ct', city: 'Grand Island', state: 'Nebraska', zip: '68801',
    countyIndex: 6, taxIdType: 'ssn', taxId: '999-00-0009',
  },
  jointFiling: false,
  property: {
    realProperty: {
      street: '900 Cherry Ct', city: 'Grand Island', stateAbbr: 'NE', zip: '68801',
      county: 'Hall', typeIndex: 0, value: '135000',
      ownershipInterest: 'Fee simple', otherInfo: 'Family home',
    },
    vehicle: {
      make: 'Chevrolet', model: 'Malibu', year: '2020', mileage: '45000',
      value: '16500', state: 'Nebraska', hasLoan: true, loanAmount: '8000',
      otherInfo: 'Primary car',
    },
    deposit: {
      type: 'Savings', institution: 'Union Bank & Trust', amount: '1500',
    },
  },
  creditors: {
    secured: {
      name: 'Great Plains Lending', street: '555 Bank St', city: 'Grand Island', state: 'Nebraska', zip: '68801',
      claimAmount: '110000', collateralValue: '135000',
    },
    priority: {
      name: 'Nebraska DOR', street: '301 Centennial Mall S', city: 'Lincoln', state: 'Nebraska', zip: '68509',
      type: 'Taxes and certain other debts you owe the government',
      totalClaim: '3000', priorityAmount: '3000', nonpriorityAmount: '0',
    },
    nonpriority: {
      name: 'Capital One', street: 'PO Box 30285', city: 'Salt Lake City', state: 'Utah', zip: '84130',
      totalClaim: '9500', type: 'Credit Card',
    },
  },
  attorney: { name: 'Jack Litigate, Esq.', firm: 'Central Nebraska Legal', agreedCompensation: '2000', priorReceived: '800' },
  rentExpense: '0',
};
