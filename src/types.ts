export interface MetrixResult {
  UserID: string;
  ScorecardID: string;
  Name: string;
  ClassName: string;
}

export interface MetrixCompetition {
  ID: number;
  Name: string;
  Results: MetrixResult[];
}

export interface MetrixApiResponse {
  Competition: MetrixCompetition;
}
