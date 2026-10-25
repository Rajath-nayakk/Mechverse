#include "VehicleFramework/VehicleConditionModel.h"

void UVehicleConditionModel::EvaluateSafetyInspection()
{
	// Strict engineering rule: Roadworthy pass requires baseline safety across structural,
	// mechanical, electrical, and tire categories.
	const bool bStructuralSafe = CurrentState.StructuralIntegrity >= 70.0f;
	const bool bBrakingSafe = CurrentState.MechanicalHealth >= 50.0f;
	const bool bTiresSafe = CurrentState.TireWheelHealth >= 40.0f;
	const bool bElectricalSafe = CurrentState.ElectricalHealth >= 50.0f;

	// Note that cosmetic categories (Paint, Cleanliness, Interior) do NOT pass/fail safety,
	// but severe structural/mechanical faults strictly fail inspection.
	CurrentState.bPassesRoadworthyInspection = (bStructuralSafe && bBrakingSafe && bTiresSafe && bElectricalSafe);
}

void UVehicleConditionModel::RecordMaintenanceEvent(const FString& OperationDescription)
{
	CurrentState.TotalServiceEventsRecorded++;
	EvaluateSafetyInspection();
}
