#include "ElectricalSystems/ElectricalDiagnosticMission.h"

UElectricalDiagnosticMission::UElectricalDiagnosticMission()
	: MissionId(TEXT("mission_slow_crank"))
	, Title(FText::FromString(TEXT("The Slow-Cranking Vehicle")))
	, CustomerComplaint(FText::FromString(TEXT("The engine cranks sluggishly in the morning.")))
	, TargetFaultId(TEXT("FAULT_HIGH_RES_GROUND"))
	, bIsDiagnosisConfirmed(false)
	, bIsRepaired(false)
	, bIsVerified(false)
{
}

bool UElectricalDiagnosticMission::SubmitDiagnosis(const FString& InFaultId, FText& OutMessage)
{
	if (InFaultId == TargetFaultId)
	{
		bIsDiagnosisConfirmed = true;
		OutMessage = FText::FromString(TEXT("Diagnosis Accurate: Confirmed by electrical evidence."));
		return true;
	}
	OutMessage = FText::FromString(TEXT("Diagnosis Incorrect: Evidence does not support this failure."));
	return false;
}

bool UElectricalDiagnosticMission::ExecuteRepair(FText& OutMessage)
{
	bIsRepaired = true;
	OutMessage = FText::FromString(TEXT("Component repair completed on circuit network."));
	return true;
}

bool UElectricalDiagnosticMission::VerifyRepair(float MeasuredMetric, float ThresholdMax, FText& OutMessage)
{
	if (bIsRepaired && MeasuredMetric < ThresholdMax)
	{
		bIsVerified = true;
		OutMessage = FText::FromString(TEXT("Verification Passed: Measured metric within manufacturer specification."));
		return true;
	}
	OutMessage = FText::FromString(TEXT("Verification Failed: Circuit still out of specification."));
	return false;
}
