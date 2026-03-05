export interface Plan {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetPlansResponse {
  plans: Plan[];
  totalCount: number;
}
