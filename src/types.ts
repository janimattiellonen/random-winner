export interface MetrixResult {
  UserID: string;
  ScorecardID: string;
  Name: string;
  ClassName: string;
  Diff?: string | number | null;
}

export interface MetrixEventStub {
  ID: string;
  Name: string;
}

export interface MetrixSubCompetition {
  ID: string;
  Name: string;
  Results: MetrixResult[];
}

export interface MetrixCompetition {
  ID: number;
  Name: string;
  Results: MetrixResult[];
  HasSubcompetitions?: 0 | 1;
  Events?: MetrixEventStub[];
  SubCompetitions?: MetrixSubCompetition[];
}

export interface MetrixApiResponse {
  /** Null when the id is unknown or missing; `Errors` then says why. */
  Competition: MetrixCompetition | null;
  Errors?: string[];
}
